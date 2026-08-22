import { corvusError, type ColumnDef, type ResultChunk } from '@corvus/contract'
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
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise'
import {
  MYSQL_CAPABILITIES,
  narrowMysqlCapabilities,
  parseMysqlVersion,
  type MysqlServerInfo,
} from './capabilities'
import { mysqlErrorToCorvus } from './errors'
import { MysqlIntrospector } from './introspect'
import { alignForMysqlType, MYSQL_TYPE, toCellValue } from './value'

/** Xem ghi chú cùng tên ở driver-postgres: mặc định TẮT, bật qua CORVUS_QUERY_TIMEOUT_MS. */
function queryTimeoutMs(): number {
  const raw = Number(process.env.CORVUS_QUERY_TIMEOUT_MS ?? 0)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
}

const DEFAULT_CHUNK_SIZE = 1_000
const IDLE_TIMEOUT_MS = 10 * 60 * 1000
const CONNECT_TIMEOUT_MS = 15_000

function quoteSavepointName(name: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw corvusError('INVALID_INPUT', `Tên savepoint không hợp lệ: ${name}`)
  }
  return `\`${name}\``
}

interface MysqlFieldPacket {
  name: string
  columnType: number
  flags?: number
  columnLength?: number
}

interface MysqlStream extends NodeJS.ReadableStream {
  destroy?(): void
  pause(): this
  resume(): this
}

interface InternalMysqlConnection {
  threadId?: number
  query(opts: unknown): {
    stream(opts?: unknown): MysqlStream
  }
}

interface ServerVarsRow extends RowDataPacket {
  version?: string
  version_comment?: string
  lower_case_table_names?: number
  sql_mode?: string
  max_allowed_packet?: number
}

function destroyStream(stream: MysqlStream | null | undefined): void {
  if (!stream) return
  if (typeof stream.destroy === 'function') {
    try {
      stream.destroy()
    } catch {
      // ignore
    }
  }
}

function toColumnDef(field: MysqlFieldPacket): ColumnDef {
  const typeId = field.columnType
  const typeEntry = Object.entries(MYSQL_TYPE).find(([_, val]) => val === typeId)
  const typeName = typeEntry ? typeEntry[0].toLowerCase() : 'unknown'
  return {
    name: field.name,
    type: typeName,
    align: alignForMysqlType(typeId),
  }
}

export class MysqlConnection implements DriverConnection {
  readonly driverId = 'mysql' as const
  readonly dialect = 'mysql' as const
  readonly introspect: MysqlIntrospector

  /** Map statement id -> threadId để cancel() có thể gửi KILL QUERY từ kết nối khác. */
  private readonly running = new Map<string, { threadId: number; conn: PoolConnection }>()
  private closed = false

  constructor(
    private readonly pool: Pool,
    readonly serverVersion: ServerVersion,
    readonly capabilities: ReturnType<typeof narrowMysqlCapabilities>,
    private readonly profile: ResolvedProfile,
  ) {
    this.introspect = new MysqlIntrospector(pool, profile.database)
  }

  /**
   * Chạy truy vấn và phát kết quả qua stream (driver-spi.md §5 / NFR-03).
   *
   * BẪY 1: PHẢI dùng `connection.query().stream()`, KHÔNG dùng `.execute()`
   * vì `execute` là prepared statement và buffer toàn bộ result set.
   */
  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) {
      throw corvusError('CONNECTION_FAILED', 'Kết nối MySQL đã đóng')
    }

    const chunkSize = Math.max(1, req.chunkSize ?? DEFAULT_CHUNK_SIZE)
    const handleId = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const conn = await this.pool.getConnection()

    // Lấy threadId từ connection nội bộ của mysql2
    const rawConn = (conn as unknown as { connection?: InternalMysqlConnection }).connection
    const threadId: number = Number((conn as unknown as { threadId?: number }).threadId ?? rawConn?.threadId ?? 0)

    if (threadId > 0) {
      this.running.set(handleId, { threadId, conn })
    }

    let abortListener: (() => void) | undefined
    let abortPromise: Promise<void> | null = null
    let activeStream: MysqlStream | null = null
    let resolveWait: (() => void) | null = null
    const startedAt = Date.now()

    if (req.signal) {
      if (req.signal.aborted) {
        conn.release()
        this.running.delete(handleId)
        throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
      }
      abortListener = () => {
        if (threadId) {
          abortPromise = this.killThread(threadId).catch(() => {
            // Bỏ qua lỗi nếu query đã xong trước khi lệnh huỷ tới
          })
        }
        if (resolveWait) {
          const fn = resolveWait
          resolveWait = null
          fn()
        }
        destroyStream(activeStream)
      }
      req.signal.addEventListener('abort', abortListener, { once: true })
    }

    try {
      if (!rawConn) {
        throw corvusError('CONNECTION_FAILED', 'Không lấy được kết nối socket MySQL nội bộ')
      }

      const sql = req.sql ?? (typeof req.command === 'string' ? req.command : '')
      // Dùng connection.query({ rowsAsArray: true }).stream()
      const queryStream = rawConn
        .query({
          sql,
          values: req.values,
          rowsAsArray: true,
        })
        .stream({ highWaterMark: chunkSize })

      activeStream = queryStream

      let columns: ColumnDef[] | undefined
      let fieldPackets: MysqlFieldPacket[] = []
      const rowBuffer: unknown[][] = []
      let streamEnded = false
      let streamError: unknown = null

      queryStream.on('fields', (fields: MysqlFieldPacket[]) => {
        fieldPackets = fields || []
        columns = fieldPackets.map(toColumnDef)
      })

      queryStream.on('data', (row: unknown[]) => {
        rowBuffer.push(row)
        if (rowBuffer.length >= chunkSize) {
          queryStream.pause()
        }
        if (resolveWait) {
          const fn = resolveWait
          resolveWait = null
          fn()
        }
      })

      queryStream.on('end', () => {
        streamEnded = true
        if (resolveWait) {
          const fn = resolveWait
          resolveWait = null
          fn()
        }
      })

      queryStream.on('error', (err: unknown) => {
        streamError = err
        streamEnded = true
        if (resolveWait) {
          const fn = resolveWait
          resolveWait = null
          fn()
        }
      })

      let seq = 0
      let emitted = 0

      for (;;) {
        if (req.signal?.aborted) {
          throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        }

        if (streamError) {
          throw mysqlErrorToCorvus(streamError)
        }

        // Chờ dữ liệu hoặc kết thúc stream nếu buffer rỗng
        if (rowBuffer.length === 0 && !streamEnded) {
          await new Promise<void>((resolve) => {
            resolveWait = resolve
          })
          if (req.signal?.aborted) {
            throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
          }
          if (streamError) {
            throw mysqlErrorToCorvus(streamError)
          }
        }

        const remaining = req.maxRows === undefined ? chunkSize : Math.min(chunkSize, req.maxRows - emitted)

        if (remaining <= 0) {
          yield {
            seq: seq++,
            rows: [],
            done: true,
            stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: true },
          }
          destroyStream(activeStream)
          return
        }

        const countToTake = Math.min(remaining, rowBuffer.length)
        const rawBatch = rowBuffer.splice(0, countToTake)

        // Resume stream nếu buffer đã giảm dưới chunkSize
        if (rowBuffer.length < chunkSize && !streamEnded) {
          queryStream.resume()
        }

        const rows = rawBatch.map((row) =>
          fieldPackets.map((f, i) => toCellValue(row[i], f.columnType, undefined, f.columnLength, f.flags)),
        )

        emitted += rows.length
        const isDone = (streamEnded && rowBuffer.length === 0) || (req.maxRows !== undefined && emitted >= req.maxRows)
        const isTruncated = req.maxRows !== undefined && emitted >= req.maxRows && (!streamEnded || rowBuffer.length > 0)

        // Nếu là chunk đầu hoặc có data hoặc done
        if (rows.length > 0 || isDone || seq === 0) {
          yield {
            seq: seq++,
            ...(seq === 1 && columns ? { columns } : {}),
            rows,
            done: isDone,
            ...(isDone
              ? { stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: isTruncated } }
              : {}),
          }
        }

        if (isDone) {
          destroyStream(activeStream)
          return
        }
      }
    } catch (err) {
      if (req.signal?.aborted) {
        try {
          conn.destroy()
        } catch {
          /* ignore */
        }
      }
      throw mysqlErrorToCorvus(err)
    } finally {
      if (req.signal && abortListener) {
        req.signal.removeEventListener('abort', abortListener)
      }
      this.running.delete(handleId)
      destroyStream(activeStream)
      if (abortPromise) {
        await abortPromise
      }
      if (req.signal?.aborted) {
        try {
          conn.destroy()
        } catch {
          /* ignore */
        }
      } else {
        conn.release()
      }
    }
  }

  async beginTransaction(opts?: TxOptions): Promise<Transaction> {
    if (this.closed) {
      throw corvusError('CONNECTION_FAILED', 'Kết nối MySQL đã đóng')
    }

    const conn = await this.pool.getConnection()
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
      if (opts?.isolationLevel) {
        const rawLevel = opts.isolationLevel.replace(/-/g, ' ').toUpperCase()
        const safeLevels = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']
        if (!safeLevels.includes(rawLevel)) {
          throw corvusError('INVALID_INPUT', `Mức cô lập không hợp lệ: ${opts.isolationLevel}`)
        }
        await conn.query(`SET TRANSACTION ISOLATION LEVEL ${rawLevel}`)
      }

      if (opts?.readOnly || this.profile.readOnly) {
        await conn.query('SET TRANSACTION READ ONLY')
      }

      await conn.query('START TRANSACTION')
    } catch (err) {
      conn.release()
      throw mysqlErrorToCorvus(err)
    }

    let settled = false
    const finish = async (sql: string) => {
      if (settled) return
      settled = true
      try {
        await conn.query(sql)
      } catch (err) {
        throw mysqlErrorToCorvus(err)
      } finally {
        conn.release()
      }
    }

    return {
      id,
      commit: () => finish('COMMIT'),
      rollback: () => finish('ROLLBACK'),
      savepoint: async (name: string) => {
        const safeName = quoteSavepointName(name)
        await conn.query(`SAVEPOINT ${safeName}`)
      },
      rollbackTo: async (name: string) => {
        const safeName = quoteSavepointName(name)
        await conn.query(`ROLLBACK TO SAVEPOINT ${safeName}`)
      },
    }
  }

  private async killThread(threadId: number): Promise<void> {
    try {
      const killerConn = await this.pool.getConnection()
      try {
        await killerConn.query(`KILL QUERY ${threadId}`)
      } finally {
        killerConn.release()
      }
    } catch (err: unknown) {
      const e = err as { errno?: number }
      // Nếu query đã hoàn thành trước khi lệnh KILL tới (mã 1094: Unknown thread id), bỏ qua
      if (e?.errno === 1094) {
        return
      }
      throw mysqlErrorToCorvus(err)
    }
  }

  /**
   * Huỷ query đang chạy bằng KILL QUERY <threadId> từ MỘT KẾT NỐI KHÁC.
   */
  async cancel(handle: StatementHandle): Promise<void> {
    const target = this.running.get(handle.id)
    if (!target || !target.threadId) {
      return
    }

    await this.killThread(target.threadId)
  }

  async ping(): Promise<number> {
    if (this.closed) {
      throw corvusError('CONNECTION_FAILED', 'Kết nối MySQL đã đóng')
    }
    const startedAt = Date.now()
    try {
      await this.pool.query('SELECT 1')
      return Date.now() - startedAt
    } catch (err) {
      throw mysqlErrorToCorvus(err)
    }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.pool.end()
  }
}

export class MysqlDriver implements DatabaseDriver {
  readonly id = 'mysql' as const
  readonly displayName = 'MySQL / MariaDB'
  readonly capabilities = MYSQL_CAPABILITIES
  readonly defaultPort = 3306

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    if (!profile.host) {
      throw corvusError('INVALID_INPUT', 'Thiếu host cho kết nối MySQL')
    }

    try {
      const pool = mysql.createPool({
        host: profile.host,
        port: profile.port ?? this.defaultPort,
        user: profile.user ?? 'root',
        password: profile.password ?? '',
        database: profile.database || undefined,
        waitForConnections: true,
        connectionLimit: 10,
        idleTimeout: IDLE_TIMEOUT_MS,
        connectTimeout: CONNECT_TIMEOUT_MS,
        supportBigNumbers: true,
        bigNumberStrings: true,
        dateStrings: true,
        charset: 'utf8mb4',
      })

      const timeoutMs = queryTimeoutMs()
      if (timeoutMs > 0) {
        pool.on('connection', (c) => {
          // `max_execution_time` chỉ áp cho SELECT — đúng phạm vi ta cần chặn.
          void c.query(`SET SESSION max_execution_time = ${timeoutMs}`).catch(() => {
            /* MariaDB và MySQL < 5.7.8 không có biến này */
          })
        })
      }

      // Lớp 2 của chế độ read-only (security.md §5 mục 2): đặt ở tầng SESSION cho MỌI kết
      // nối trong pool. Bộ phân loại SQL ở engine là lớp 1; hai lớp bù nhau, không thay nhau.
      if (profile.readOnly) {
        pool.on('connection', (conn) => {
          void conn.query('SET SESSION TRANSACTION READ ONLY').catch(() => {
            /* server cũ không hỗ trợ thì bỏ qua — lớp 1 vẫn chặn */
          })
        })
      }

      // Đọc runtime server variables lúc connect để thu hẹp capability
      const [rows] = await pool.query<ServerVarsRow[]>(
        `SELECT @@version AS version,
                @@version_comment AS version_comment,
                @@lower_case_table_names AS lower_case_table_names,
                @@sql_mode AS sql_mode,
                @@max_allowed_packet AS max_allowed_packet`,
      )

      const vars = rows[0]
      const versionStr = String(vars?.version ?? '8.0.0')
      const commentStr = String(vars?.version_comment ?? '')

      const serverVersion = parseMysqlVersion(versionStr, commentStr)

      const lowerCaseTableNames = vars?.lower_case_table_names
      const sqlMode = vars?.sql_mode

      const serverInfo: MysqlServerInfo = {
        version: serverVersion,
        isMariaDb: serverVersion.isMariaDb,
        lowerCaseTableNames: lowerCaseTableNames != null ? Number(lowerCaseTableNames) : undefined,
        sqlMode: sqlMode ? String(sqlMode) : undefined,
      }

      const capabilities = narrowMysqlCapabilities(serverInfo)

      return new MysqlConnection(pool, serverVersion, capabilities, profile)
    } catch (err) {
      throw mysqlErrorToCorvus(err)
    }
  }
}

export const mysqlDriver = new MysqlDriver()

export class MariaDbDriver implements DatabaseDriver {
  readonly id = 'mariadb' as const
  readonly displayName = 'MariaDB'
  readonly capabilities = MYSQL_CAPABILITIES
  readonly defaultPort = 3307

  async connect(profile: ResolvedProfile, ctx?: DriverContext): Promise<DriverConnection> {
    return mysqlDriver.connect(profile, ctx)
  }
}

export const mariadbDriver = new MariaDbDriver()

