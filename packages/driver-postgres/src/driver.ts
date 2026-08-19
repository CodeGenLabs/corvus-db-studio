import { corvusError } from '@corvus/contract'
import type { ColumnDef, ResultChunk } from '@corvus/contract'
import type {
  DatabaseDriver,
  DriverConnection,
  DriverContext,
  ExecuteRequest,
  ResolvedProfile,
  ServerVersion,
  StatementHandle,
  Transaction,
  TxOptions,
} from '@corvus/driver-core'
import Cursor from 'pg-cursor'
import pgTypes from 'pg-types'
import { Pool, type PoolClient } from 'pg'
import { POSTGRES_CAPABILITIES } from './capabilities'
import { mapPgError, pgErrorToCorvus } from './errors'
import { PostgresIntrospector } from './introspect'
import { alignForOid, toCellValue } from './value'

/** OID của 2 kiểu ngày tháng ta cố tình không cho pg parse. */
const PG_OID = { date: 1082, timestamp: 1114 } as const

const DEFAULT_CHUNK_SIZE = 1_000
/** Kết nối rỗi quá ngưỡng này bị đóng (SPEC-01 FR-01.16). */
const IDLE_TIMEOUT_MS = 10 * 60 * 1000
const CONNECT_TIMEOUT_MS = 15_000

function parseServerVersion(raw: string, numeric: number): ServerVersion {
  // server_version_num: 160002 => 16.0.2 ; 90624 => 9.6.24
  const major = Math.floor(numeric / 10000)
  const minor = Math.floor((numeric % 10000) / 100)
  const patch = numeric % 100
  return { raw, major, minor, patch }
}

/**
 * Thu hẹp capability theo server THẬT, không dùng capability tĩnh của driver.
 * SPEC-01 FR-01 §7 / capability-matrix.md §8.
 */
function narrowCapabilities(version: ServerVersion): typeof POSTGRES_CAPABILITIES {
  return {
    ...POSTGRES_CAPABILITIES,
    objects: {
      ...POSTGRES_CAPABILITIES.objects,
      // CREATE PROCEDURE chỉ có từ PostgreSQL 11.
      procedure: version.major >= 11,
    },
  }
}

export class PostgresConnection implements DriverConnection {
  readonly driverId = 'postgres' as const
  readonly dialect = 'postgres' as const
  readonly introspect: PostgresIntrospector

  /** Statement đang chạy, để `cancel()` biết cần huỷ backend nào. */
  private readonly running = new Map<string, { pid: number; client: PoolClient }>()
  private closed = false

  constructor(
    private readonly pool: Pool,
    readonly serverVersion: ServerVersion,
    readonly capabilities: ReturnType<typeof narrowCapabilities>,
    private readonly profile: ResolvedProfile,
  ) {
    this.introspect = new PostgresIntrospector(pool)
  }

  /**
   * Chạy SQL và phát kết quả theo từng lô qua cursor.
   *
   * KHÔNG BAO GIỜ buffer cả result set (driver-spi.md §5 / NFR-03): `SELECT *` trên bảng
   * 16 triệu dòng phải chạy được với RAM phẳng. Vì vậy dùng `pg-cursor` chứ không phải
   * `client.query()` trả mảng.
   */
  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) throw corvusError('CONNECTION_FAILED', 'Kết nối đã đóng')

    const chunkSize = Math.max(1, req.chunkSize ?? DEFAULT_CHUNK_SIZE)
    const handleId = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const client = await this.acquire()

    let cursor: Cursor | undefined
    let seq = 0
    let emitted = 0
    let columns: ColumnDef[] | undefined
    let abortListener: (() => void) | undefined
    const startedAt = Date.now()

    try {
      // Lấy pid để cancel() có thể gọi pg_cancel_backend từ một kết nối KHÁC.
      const pidRes = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      const pid = pidRes.rows[0]?.pid
      if (pid !== undefined) this.running.set(handleId, { pid, client })

      if (req.signal) {
        if (req.signal.aborted) throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        // Chỉ kiểm `signal.aborted` ở đầu vòng lặp là KHÔNG đủ: khi query chạy 10 phút,
        // ta đang bị chặn trong `readCursor` và không bao giờ quay lại đầu vòng lặp.
        // Phải chủ động gửi pg_cancel_backend để backend nhả ra (IV-3, ≤ 200 ms).
        abortListener = () => {
          void this.cancel({ id: handleId }).catch(() => {
            // Backend có thể đã kết thúc trước khi lệnh huỷ tới. Không phải lỗi người dùng.
          })
        }
        req.signal.addEventListener('abort', abortListener, { once: true })
      }

      // rowMode 'array' là bắt buộc: mặc định pg trả row dạng object nên `row[i]` là
      // undefined và mọi giá trị biến thành NULL (lỗi đã gặp khi chạy conformance).
      cursor = client.query(new Cursor(req.sql, req.values ?? [], { rowMode: 'array' }))

      for (;;) {
        if (req.signal?.aborted) {
          throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        }

        const remaining = req.maxRows === undefined ? chunkSize : Math.min(chunkSize, req.maxRows - emitted)
        if (remaining <= 0) {
          yield {
            seq: seq++,
            rows: [],
            done: true,
            stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: true },
          }
          return
        }

        const batch = await readCursor(cursor, remaining)

        if (columns === undefined) {
          columns = (cursor as unknown as { _result?: { fields?: PgField[] } })._result?.fields?.map(toColumnDef) ?? []
        }

        const fields = (cursor as unknown as { _result?: { fields?: PgField[] } })._result?.fields ?? []
        const rows = batch.map((row) => fields.map((f, i) => toCellValue((row as unknown[])[i], f.dataTypeID)))
        emitted += rows.length

        const done = batch.length < remaining
        yield {
          seq: seq++,
          ...(seq === 1 ? { columns } : {}),
          rows,
          done,
          ...(done
            ? { stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: false } }
            : {}),
        }
        if (done) return
      }
    } catch (err) {
      throw pgErrorToCorvus(err)
    } finally {
      // `finally` này chạy cả khi người tiêu thụ `break` giữa chừng (for-await gọi
      // generator.return()) — đó là đường dọn tài nguyên duy nhất, không được bỏ qua.
      if (req.signal && abortListener) req.signal.removeEventListener('abort', abortListener)
      this.running.delete(handleId)
      // Đóng cursor TRƯỚC khi trả client về pool, nếu không client sẽ ở trạng thái dở.
      if (cursor) await closeCursorSafely(cursor)
      client.release()
    }
  }

  async beginTransaction(opts?: TxOptions): Promise<Transaction> {
    const client = await this.acquire()
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      await client.query('BEGIN')
      if (opts?.isolationLevel) {
        const rawLevel = opts.isolationLevel.replace(/-/g, ' ').toUpperCase()
        const safeLevel = (['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'] as const).find(
          (l) => l === rawLevel,
        )
        if (!safeLevel) {
          throw corvusError('INVALID_INPUT', `Mức cô lập không hợp lệ: ${opts.isolationLevel}`)
        }
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${safeLevel}`)
      }
      // Phòng thủ nhiều lớp cho read-only: đặt ở tầng session, không chỉ chặn ở UI
      // (security.md §5).
      if (opts?.readOnly || this.profile.readOnly) {
        await client.query('SET TRANSACTION READ ONLY')
      }
    } catch (err) {
      client.release()
      throw pgErrorToCorvus(err)
    }

    let settled = false
    const finish = async (sql: string) => {
      if (settled) return
      settled = true
      try {
        await client.query(sql)
      } catch (err) {
        throw pgErrorToCorvus(err)
      } finally {
        // Client chỉ trả về pool sau commit/rollback (SPEC-01 §6).
        client.release()
      }
    }

    return {
      id,
      commit: () => finish('COMMIT'),
      rollback: () => finish('ROLLBACK'),
      savepoint: async (name: string) => {
        await client.query(`SAVEPOINT ${quoteSavepoint(name)}`)
      },
      rollbackTo: async (name: string) => {
        await client.query(`ROLLBACK TO SAVEPOINT ${quoteSavepoint(name)}`)
      },
    }
  }

  /**
   * Huỷ statement đang chạy.
   *
   * Phải gửi `pg_cancel_backend` từ một kết nối KHÁC — kết nối đang chạy query thì đang
   * bị chặn, không nhận được lệnh nào (driver-spi.md §5, huỷ ≤ 200 ms).
   */
  async cancel(handle: StatementHandle): Promise<void> {
    const entry = this.running.get(handle.id)
    if (!entry) return
    const client = await this.pool.connect()
    try {
      await client.query('SELECT pg_cancel_backend($1)', [entry.pid])
    } finally {
      client.release()
    }
  }

  async ping(): Promise<number> {
    const t0 = Date.now()
    const client = await this.acquire()
    try {
      await client.query('SELECT 1')
      return Date.now() - t0
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.pool.end()
  }

  private async acquire(): Promise<PoolClient> {
    try {
      return await this.pool.connect()
    } catch (err) {
      throw pgErrorToCorvus(err)
    }
  }
}

export class PostgresDriver implements DatabaseDriver {
  readonly id = 'postgres' as const
  readonly displayName = 'PostgreSQL'
  readonly capabilities = POSTGRES_CAPABILITIES
  readonly defaultPort = 5432

  async connect(profile: ResolvedProfile, ctx?: DriverContext): Promise<DriverConnection> {
    if (!profile.host) throw corvusError('INVALID_INPUT', 'Thiếu host cho kết nối PostgreSQL')

    const pool = new Pool({
      host: profile.localProxyPort ? '127.0.0.1' : profile.host,
      port: profile.localProxyPort ?? profile.port ?? this.defaultPort,
      database: profile.database,
      user: profile.user,
      password: profile.password,
      max: 8,
      min: 0,
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      ssl: toPgSsl(profile),
      // Dùng parser MẶC ĐỊNH của pg (int8/numeric đã là string nên không mất chính xác),
      // chỉ ghi đè đúng 2 kiểu dễ sai timezone: `date` và `timestamp without time zone`.
      // pg parse chúng thành Date theo timezone của process — sai lệch ngày với dữ liệu
      // không có offset. Giữ nguyên text để `toCellValue` không phải đoán.
      //
      // KHÔNG tắt parser toàn cục: chính các truy vấn introspection của driver cũng đi qua
      // pool này, tắt sẽ khiến `boolean` về thành 't'/'f' (lỗi đã gặp khi chạy conformance).
      types: {
        getTypeParser: ((oid: number, format?: string) => {
          if (oid === PG_OID.date || oid === PG_OID.timestamp) return (v: string) => v
          return pgTypes.getTypeParser(oid, format as never)
        }) as never,
      },
      application_name: 'corvus-db-studio',
    })

    // pool phát 'error' cho client rỗi bị server đóng — không bắt thì process crash.
    pool.on('error', (err) => {
      ctx?.logger?.warn('postgres pool error', { message: err.message })
    })

    let version: ServerVersion
    try {
      const client = await pool.connect()
      try {
        const res = await client.query<{ v: string; n: string }>(
          'SELECT version() AS v, current_setting($1) AS n',
          ['server_version_num'],
        )
        version = parseServerVersion(res.rows[0]?.v ?? 'unknown', Number(res.rows[0]?.n ?? 0))
      } finally {
        client.release()
      }
    } catch (err) {
      await pool.end().catch(() => {
        /* pool có thể chưa mở được kết nối nào; lỗi đóng ở đây không có ý nghĩa */
      })
      throw pgErrorToCorvus(err)
    }

    return new PostgresConnection(pool, version, narrowCapabilities(version), profile)
  }
}

export const postgresDriver = new PostgresDriver()

// ── Trợ giúp nội bộ ──────────────────────────────────────────────────────────

interface PgField {
  name: string
  dataTypeID: number
}

function toColumnDef(f: PgField): ColumnDef {
  return { name: f.name, type: String(f.dataTypeID), align: alignForOid(f.dataTypeID) }
}

/** `pg-cursor` chỉ có API callback; bọc lại thành promise. */
function readCursor(cursor: Cursor, count: number): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    cursor.read(count, (err: Error | undefined, rows: unknown[]) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
}

async function closeCursorSafely(cursor: Cursor): Promise<void> {
  await new Promise<void>((resolve) => {
    // Lỗi khi đóng cursor không đáng để ném ra ngoài: query đã kết thúc hoặc đã lỗi rồi.
    cursor.close(() => resolve())
  })
}

/** Tên savepoint do hệ thống sinh, nhưng vẫn quote để không bao giờ tin chuỗi vào. */
function quoteSavepoint(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw corvusError('INVALID_INPUT', `Tên savepoint không hợp lệ: ${name}`)
  }
  return name
}

function toPgSsl(profile: ResolvedProfile) {
  const ssl = profile.ssl
  if (!ssl || ssl.mode === 'disable') return undefined
  return {
    // 'require' = mã hoá nhưng không xác thực CA; verify-* thì bật xác thực.
    rejectUnauthorized: ssl.mode === 'verify-ca' || ssl.mode === 'verify-full',
    ca: ssl.caCert,
    cert: ssl.clientCert,
    key: ssl.clientKey,
  }
}

export { mapPgError }
