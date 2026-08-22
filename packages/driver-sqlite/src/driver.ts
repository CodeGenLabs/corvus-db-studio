import fs from 'node:fs'
import path from 'node:path'
import { corvusError } from '@corvus/contract'
import type { ColumnDef, ResultChunk } from '@corvus/contract'
import Database from 'better-sqlite3'
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
import { SQLITE_CAPABILITIES, narrowSqliteCapabilities } from './capabilities'
import { sqliteErrorToCorvus } from './errors'
import { SqliteIntrospector } from './introspect'
import { alignForDeclaredType, toCellValue } from './value'

const DEFAULT_CHUNK_SIZE = 1_000
/** Chờ thay vì lỗi SQLITE_BUSY ngay khi tiến trình khác đang ghi. */
const BUSY_TIMEOUT_MS = 5_000

/** `:memory:` là database tạm trong RAM — chỉ dùng cho test, không phải một tệp. */
const MEMORY_PATH = ':memory:'

function parseServerVersion(raw: string): ServerVersion {
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(raw)
  return {
    raw,
    major: m ? Number(m[1]) : 0,
    minor: m ? Number(m[2]) : 0,
    patch: m && m[3] !== undefined ? Number(m[3]) : 0,
  }
}

/**
 * Tên savepoint chỉ được là định danh đơn giản.
 *
 * `SAVEPOINT` không nhận tham số bind, nên tên bắt buộc phải nhúng vào SQL. Chặn bằng
 * allowlist thay vì escape: escape sai một lần là mở đường injection (security.md §7).
 */
function quoteSavepointName(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(name)) {
    throw corvusError('INVALID_INPUT', `Tên savepoint không hợp lệ: '${name}'`)
  }
  return name
}

interface SqliteColumnInfo {
  name: string
  type: string | null
}

export class SqliteConnection implements DriverConnection {
  readonly driverId = 'sqlite' as const
  readonly dialect = 'sqlite' as const
  readonly introspect: SqliteIntrospector

  /**
   * Statement đang chạy → cờ huỷ.
   *
   * `better-sqlite3` là API **đồng bộ** và không có `interrupt()`, nên không thể chặn giữa
   * một `sqlite3_step()` đang chạy. Huỷ ở đây nghĩa là "dừng ở dòng kế tiếp" — đủ để cắt
   * một `SELECT` 10 triệu dòng, KHÔNG đủ để cắt một câu lệnh đơn lẻ chạy lâu.
   * Vì vậy `capabilities.exec.cancelStatement` khai **false** (driver-spi.md §2: thà thiếu
   * còn hơn khai khống).
   */
  private readonly running = new Map<string, AbortController>()
  private closed = false

  constructor(
    private readonly db: Database.Database,
    readonly serverVersion: ServerVersion,
    readonly capabilities: typeof SQLITE_CAPABILITIES,
    private readonly profile: ResolvedProfile,
  ) {
    this.introspect = new SqliteIntrospector(db)
  }

  /**
   * Chạy SQL và phát kết quả theo từng lô.
   *
   * Dùng `stmt.raw(true).iterate()` — iterate đọc từng dòng từ máy ảo SQLite, KHÔNG dựng
   * cả mảng kết quả (driver-spi.md §5). `raw(true)` trả mảng thay vì object, khớp với
   * `rows: unknown[][]` của `ResultChunk` và tránh mất cột trùng tên.
   */
  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) throw corvusError('CONNECTION_FAILED', 'Kết nối đã đóng')

    const chunkSize = Math.max(1, req.chunkSize ?? DEFAULT_CHUNK_SIZE)
    const handleId = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const abort = new AbortController()
    this.running.set(handleId, abort)

    const onAbort = () => abort.abort()
    if (req.signal) {
      if (req.signal.aborted) {
        this.running.delete(handleId)
        throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
      }
      req.signal.addEventListener('abort', onAbort, { once: true })
    }

    const startedAt = Date.now()
    let iterator: Iterator<unknown[]> | undefined

    const sql = req.sql ?? (typeof req.command === 'string' ? req.command : '')
    try {
      const stmt = this.db.prepare(sql)

      // Câu lệnh không trả dòng (INSERT/UPDATE/DDL): chạy một lần, báo affectedRows.
      if (!stmt.reader) {
        if (this.profile.readOnly) {
          // Lớp phòng thủ thứ hai: database đã mở readonly nên SQLite cũng chặn, nhưng
          // chặn ở đây cho ra lỗi có nghĩa thay vì SQLITE_READONLY thô (security.md §5).
          throw corvusError('READ_ONLY', 'Kết nối ở chế độ chỉ đọc, không chạy được câu lệnh ghi')
        }
        const info = stmt.run(...(req.values ?? []))
        yield {
          seq: 0,
          columns: [],
          rows: [],
          done: true,
          stats: {
            rowCount: 0,
            durationMs: Date.now() - startedAt,
            affectedRows: Number(info.changes),
            truncated: false,
          },
        }
        return
      }

      // safeIntegers: INTEGER của SQLite rộng 64 bit. Không bật thì
      // 9223372036854775807 âm thầm thành 9223372036854776000.
      stmt.raw(true)
      stmt.safeIntegers(true)

      // `columns()` phải gọi TRƯỚC khi iterate cạn: sau khi statement reset, kiểu khai báo
      // vẫn đọc được nhưng gọi sớm cho ta dùng luôn ở chunk đầu.
      const info = stmt.columns() as SqliteColumnInfo[]
      const columns: ColumnDef[] = info.map((c) => ({
        name: c.name,
        // Cột biểu thức (`SELECT 1 + 1`) không có kiểu khai báo — ghi 'expr' để UI biết
        // rằng đây không phải kiểu của một cột thật, thay vì để trống gây hiểu nhầm.
        type: c.type ?? 'expr',
        align: alignForDeclaredType(c.type),
      }))

      iterator = stmt.iterate(...(req.values ?? [])) as Iterator<unknown[]>

      let seq = 0
      let emitted = 0
      for (;;) {
        if (abort.signal.aborted) throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')

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

        const rows: unknown[][] = []
        let exhausted = false
        while (rows.length < remaining) {
          const next = iterator.next()
          if (next.done === true) {
            exhausted = true
            break
          }
          rows.push(info.map((c, i) => toCellValue(next.value[i], c.type)))
        }
        emitted += rows.length

        const done = exhausted
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
      throw sqliteErrorToCorvus(err)
    } finally {
      if (req.signal) req.signal.removeEventListener('abort', onAbort)
      this.running.delete(handleId)
      // Người tiêu thụ `break` giữa chừng → for-await gọi generator.return() → chạy vào
      // đây. Phải đóng iterator, nếu không statement giữ khoá đọc trên tệp.
      iterator?.return?.()
    }
  }

  /**
   * `opts` bị bỏ qua có chủ ý.
   *
   * SQLite không có `SET TRANSACTION READ ONLY` và cũng chỉ có một mức cô lập thật
   * (serializable). Chế độ chỉ đọc được áp ở chỗ MẠNH hơn: tệp được mở với cờ `readonly`
   * lúc connect, nên chính SQLite chặn ghi — không phụ thuộc việc gọi đúng tuỳ chọn ở đây
   * (security.md §5, phòng thủ nhiều lớp).
   */
  async beginTransaction(_opts?: TxOptions): Promise<Transaction> {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    try {
      // SQLite chỉ có một transaction cho mỗi connection, nên không cần "acquire client"
      // như PostgreSQL. DEFERRED là mặc định và đúng cho phần lớn trường hợp.
      this.db.prepare('BEGIN').run()
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }

    let settled = false
    const finish = (sql: 'COMMIT' | 'ROLLBACK') => {
      if (settled) return Promise.resolve()
      settled = true
      try {
        this.db.prepare(sql).run()
        return Promise.resolve()
      } catch (err) {
        return Promise.reject(sqliteErrorToCorvus(err))
      }
    }

    return {
      id,
      commit: () => finish('COMMIT'),
      rollback: () => finish('ROLLBACK'),
      savepoint: async (name: string) => {
        this.db.prepare(`SAVEPOINT ${quoteSavepointName(name)}`).run()
      },
      rollbackTo: async (name: string) => {
        this.db.prepare(`ROLLBACK TO SAVEPOINT ${quoteSavepointName(name)}`).run()
      },
    }
  }

  /**
   * Huỷ statement đang chạy — xem ghi chú ở `running`: dừng ở dòng kế tiếp, không cắt
   * được một câu lệnh đơn lẻ đang chạy.
   */
  async cancel(handle: StatementHandle): Promise<void> {
    this.running.get(handle.id)?.abort()
  }

  async ping(): Promise<number> {
    const t0 = Date.now()
    try {
      this.db.prepare('SELECT 1').get()
      return Date.now() - t0
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    for (const abort of this.running.values()) abort.abort()
    this.running.clear()
    this.db.close()
  }
}

export class SqliteDriver implements DatabaseDriver {
  readonly id = 'sqlite' as const
  readonly displayName = 'SQLite'
  readonly capabilities = SQLITE_CAPABILITIES

  /**
   * Mở tệp SQLite.
   *
   * Hai quyết định đáng ghi lại:
   *
   * 1. `fileMustExist: true`. SQLite mặc định TẠO tệp mới khi không thấy — nghĩa là đánh
   *    sai một ký tự trong đường dẫn sẽ cho ra một database rỗng và người dùng tưởng dữ
   *    liệu của mình biến mất. Tạo database mới là một hành động riêng, có xác nhận.
   * 2. KHÔNG đặt `journal_mode`. `journal_mode = WAL` ghi vĩnh viễn vào tệp của người dùng
   *    và tạo thêm `-wal`/`-shm` — công cụ quản trị không được tự đổi cấu hình tệp mà
   *    người ta chỉ mở ra để xem. Chỉ đặt pragma phạm vi phiên.
   */
  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    if (!profile.database) {
      throw corvusError('INVALID_INPUT', 'Thiếu đường dẫn tệp cho kết nối SQLite')
    }

    const isMemory = profile.database === MEMORY_PATH
    let file = profile.database
    if (isMemory) {
      file = MEMORY_PATH
    } else if (path.isAbsolute(profile.database)) {
      file = profile.database
    } else {
      const cwdResolved = path.resolve(profile.database)
      if (fs.existsSync(cwdResolved)) {
        file = cwdResolved
      } else {
        const parentResolved = path.resolve(process.cwd(), '../..', profile.database)
        if (fs.existsSync(parentResolved)) {
          file = parentResolved
        } else {
          file = cwdResolved
        }
      }
    }

    let db: Database.Database
    try {
      db = new Database(file, {
        readonly: profile.readOnly === true,
        fileMustExist: !isMemory,
        timeout: BUSY_TIMEOUT_MS,
      })
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }

    try {
      // Thư viện C của SQLite mặc định TẮT kiểm khoá ngoại, nhưng `better-sqlite3` đã tự bật
      // khi mở (đo được: `PRAGMA foreign_keys` → 1 ngay sau `new Database()`). Dòng này vì
      // vậy là DƯ — giữ lại có chủ ý để hành vi không phụ thuộc mặc định của thư viện, nhưng
      // đừng tưởng nó đang gánh việc: xoá nó đi không test nào đỏ, và đúng là không nên đỏ.
      // Bảo đảm thật ("FK đang bật") được kiểm trực tiếp bằng test đọc PRAGMA.
      if (!profile.readOnly) db.pragma('foreign_keys = ON')
      db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`)

      const row = db.prepare('SELECT sqlite_version() AS v').get() as { v: string }
      const version = parseServerVersion(row.v)
      return new SqliteConnection(db, version, narrowSqliteCapabilities(version), profile)
    } catch (err) {
      db.close()
      throw sqliteErrorToCorvus(err)
    }
  }
}

export const sqliteDriver = new SqliteDriver()
