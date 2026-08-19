import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

/**
 * Ánh xạ lỗi SQLite → `ErrorCode` (driver-spi.md §7).
 *
 * `better-sqlite3` ném `SqliteError` với `.code` là tên hằng của SQLite
 * (`SQLITE_CONSTRAINT_UNIQUE`, `SQLITE_BUSY`, …). Mã mở rộng (có hậu tố sau dấu `_` thứ hai)
 * nói rõ hơn mã cơ bản rất nhiều — `SQLITE_CONSTRAINT` một mình không phân biệt được
 * "trùng khoá" với "vi phạm khoá ngoại", mà hai cái đó hiện thông báo khác nhau cho người
 * dùng. Vì vậy bảng này tra mã mở rộng TRƯỚC, rồi mới rơi về mã cơ bản.
 */
const SQLITE_ERROR_MAP: Record<string, ErrorCode> = {
  // ── Ràng buộc ─────────────────────────────────────────────────────────────
  SQLITE_CONSTRAINT_PRIMARYKEY: 'DUPLICATE_KEY',
  SQLITE_CONSTRAINT_UNIQUE: 'DUPLICATE_KEY',
  SQLITE_CONSTRAINT_ROWID: 'DUPLICATE_KEY',
  SQLITE_CONSTRAINT_FOREIGNKEY: 'FOREIGN_KEY_VIOLATION',
  SQLITE_CONSTRAINT_TRIGGER: 'INVALID_INPUT',
  SQLITE_CONSTRAINT_NOTNULL: 'INVALID_INPUT',
  SQLITE_CONSTRAINT_CHECK: 'INVALID_INPUT',
  SQLITE_CONSTRAINT_DATATYPE: 'INVALID_INPUT',
  SQLITE_CONSTRAINT_COMMITHOOK: 'INVALID_INPUT',
  SQLITE_CONSTRAINT_VTAB: 'INVALID_INPUT',
  SQLITE_MISMATCH: 'INVALID_INPUT',
  SQLITE_TOOBIG: 'INVALID_INPUT',
  SQLITE_RANGE: 'INVALID_INPUT',
  SQLITE_CONSTRAINT: 'INVALID_INPUT',

  // ── Khoá và tranh chấp ────────────────────────────────────────────────────
  SQLITE_BUSY: 'LOCK_TIMEOUT',
  SQLITE_BUSY_SNAPSHOT: 'LOCK_TIMEOUT',
  SQLITE_BUSY_TIMEOUT: 'LOCK_TIMEOUT',
  SQLITE_BUSY_RECOVERY: 'LOCK_TIMEOUT',
  SQLITE_LOCKED: 'DEADLOCK',
  SQLITE_LOCKED_SHAREDCACHE: 'DEADLOCK',

  // ── Chỉ đọc ───────────────────────────────────────────────────────────────
  SQLITE_READONLY: 'READ_ONLY',
  SQLITE_READONLY_DBMOVED: 'READ_ONLY',
  SQLITE_READONLY_CANTINIT: 'READ_ONLY',
  SQLITE_READONLY_RECOVERY: 'READ_ONLY',
  SQLITE_READONLY_ROLLBACK: 'READ_ONLY',
  SQLITE_READONLY_DIRECTORY: 'READ_ONLY',
  SQLITE_PERM: 'FORBIDDEN',
  SQLITE_AUTH: 'FORBIDDEN',

  // ── Mở tệp / truy cập ─────────────────────────────────────────────────────
  SQLITE_CANTOPEN: 'CONNECTION_FAILED',
  SQLITE_CANTOPEN_ISDIR: 'CONNECTION_FAILED',
  SQLITE_CANTOPEN_NOTEMPDIR: 'CONNECTION_FAILED',
  SQLITE_NOTADB: 'CONNECTION_FAILED',
  SQLITE_CORRUPT: 'INTERNAL_ERROR',
  SQLITE_CORRUPT_VTAB: 'INTERNAL_ERROR',
  SQLITE_IOERR: 'INTERNAL_ERROR',
  SQLITE_FULL: 'INTERNAL_ERROR',
  SQLITE_NOMEM: 'INTERNAL_ERROR',
  SQLITE_PROTOCOL: 'CONNECTION_FAILED',

  // ── Huỷ ───────────────────────────────────────────────────────────────────
  SQLITE_INTERRUPT: 'QUERY_CANCELLED',
  SQLITE_ABORT: 'QUERY_CANCELLED',

  // ── Khác ──────────────────────────────────────────────────────────────────
  SQLITE_SCHEMA: 'INTERNAL_ERROR',
  SQLITE_MISUSE: 'INTERNAL_ERROR',
  SQLITE_NOTFOUND: 'NOT_FOUND',
}

/**
 * `SQLITE_ERROR` là mã chung cho MỌI lỗi biên dịch câu lệnh, nên riêng nó phải đọc thêm
 * thông báo mới phân được "sai cú pháp" với "không có bảng" — hai lỗi mà người dùng xử lý
 * khác nhau hoàn toàn.
 *
 * Chuỗi so khớp là thông báo do chính SQLite sinh (tiếng Anh, ổn định qua các bản), không
 * phải dữ liệu người dùng nhập.
 */
function classifyGenericError(message: string): ErrorCode {
  const m = message.toLowerCase()
  if (m.includes('no such table') || m.includes('no such view')) return 'TABLE_NOT_FOUND'
  if (m.includes('no such column')) return 'COLUMN_NOT_FOUND'
  if (m.includes('no such function') || m.includes('no such collation')) return 'INVALID_INPUT'
  if (m.includes('syntax error') || m.includes('unrecognized token') || m.includes('incomplete input')) {
    return 'SYNTAX_ERROR'
  }
  if (m.includes('attempt to write a readonly database')) return 'READ_ONLY'
  if (m.includes('already exists')) return 'DUPLICATE_KEY'
  // Mọi lỗi biên dịch còn lại vẫn là câu lệnh không dùng được → SYNTAX_ERROR sát nghĩa hơn
  // INTERNAL_ERROR: lỗi ở câu lệnh của người dùng, không phải ở hệ thống.
  return 'SYNTAX_ERROR'
}

interface SqliteLikeError {
  code?: unknown
  message?: unknown
}

/**
 * Đổi lỗi bất kỳ từ `better-sqlite3` thành `CorvusError`.
 *
 * KHÔNG đính lỗi gốc vào `cause`: đường dẫn tệp database có thể nằm trong thông báo và
 * `cause` là chỗ hay bị `JSON.stringify` kéo ra ngoài (security.md §2).
 */
export function sqliteErrorToCorvus(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = (err ?? {}) as SqliteLikeError
  const message = typeof e.message === 'string' ? e.message : String(err)
  const rawCode = typeof e.code === 'string' ? e.code : undefined

  if (rawCode === 'SQLITE_ERROR' || rawCode === undefined) {
    return corvusError(classifyGenericError(message), message, { detail: rawCode })
  }

  const mapped = SQLITE_ERROR_MAP[rawCode]
  if (mapped) return corvusError(mapped, message, { detail: rawCode })

  // Mã mở rộng chưa có trong bảng → thử mã cơ bản (`SQLITE_IOERR_READ` → `SQLITE_IOERR`).
  const parts = rawCode.split('_')
  if (parts.length > 2) {
    const base = `${parts[0]}_${parts[1]}`
    const baseMapped = SQLITE_ERROR_MAP[base]
    if (baseMapped) return corvusError(baseMapped, message, { detail: rawCode })
  }

  return corvusError('INTERNAL_ERROR', message, { detail: rawCode })
}

/** Số mã được ánh xạ — dùng trong test để chứng minh đạt ngưỡng ≥ 20 của driver-spi §7. */
export const SQLITE_MAPPED_CODE_COUNT = Object.keys(SQLITE_ERROR_MAP).length
