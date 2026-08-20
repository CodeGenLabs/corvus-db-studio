import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

export const MSSQL_ERROR_MAP: Record<number, ErrorCode> = {
  // ── Quyền truy cập & Xác thực ─────────────────────────────────────────────
  18456: 'UNAUTHORIZED', // Login failed for user
  229: 'UNAUTHORIZED', // The SELECT permission was denied on the object
  230: 'UNAUTHORIZED', // The SELECT permission was denied on the column

  // ── Database & Schema & Table & Column ────────────────────────────────────
  4060: 'NOT_FOUND', // Cannot open database requested by the login
  208: 'TABLE_NOT_FOUND', // Invalid object name
  207: 'COLUMN_NOT_FOUND', // Invalid column name
  2812: 'NOT_FOUND', // Could not find stored procedure
  3701: 'NOT_FOUND', // Cannot drop object because it does not exist
  2714: 'DUPLICATE_KEY', // There is already an object named

  // ── Cú pháp & Ngữ nghĩa & Cardinality ─────────────────────────────────────
  102: 'SYNTAX_ERROR', // Incorrect syntax near
  156: 'SYNTAX_ERROR', // Incorrect syntax near the keyword
  170: 'SYNTAX_ERROR', // Line 1: Incorrect syntax near
  105: 'SYNTAX_ERROR', // Unclosed quotation mark after the character string
  1038: 'SYNTAX_ERROR', // An object or column name is missing or empty
  209: 'INVALID_INPUT', // Ambiguous column name
  512: 'INVALID_INPUT', // Subquery returned more than 1 value

  // ── Ràng buộc dữ liệu ─────────────────────────────────────────────────────
  2627: 'DUPLICATE_KEY', // Violation of PRIMARY KEY / UNIQUE constraint
  2601: 'DUPLICATE_KEY', // Cannot insert duplicate key row in object with unique index
  547: 'FOREIGN_KEY_VIOLATION', // The INSERT/UPDATE/DELETE statement conflicted with the FOREIGN KEY / CHECK constraint
  515: 'INVALID_INPUT', // Cannot insert the value NULL into column

  // ── Lỗi kiểu dữ liệu & Giá trị ─────────────────────────────────────────────
  8134: 'INVALID_INPUT', // Divide by zero error encountered
  245: 'INVALID_INPUT', // Conversion failed when converting the varchar value to data type int
  8114: 'INVALID_INPUT', // Error converting data type
  241: 'INVALID_INPUT', // Conversion failed when converting date and/or time from character string
  242: 'INVALID_INPUT', // The conversion of a varchar data type to a datetime data type resulted in an out-of-range value
  8152: 'INVALID_INPUT', // String or binary data would be truncated

  // ── Huỷ & Timeout ─────────────────────────────────────────────────────────
  1222: 'LOCK_TIMEOUT', // Lock request time out period exceeded
  1205: 'DEADLOCK', // Transaction (Process ID) was deadlocked on resources with another process

  // ── Transaction ───────────────────────────────────────────────────────────
  627: 'INVALID_INPUT', // Cannot use SAVE TRANSACTION outside of a transaction
  3902: 'INVALID_INPUT', // The COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION
  3903: 'INVALID_INPUT', // The ROLLBACK TRANSACTION request has no corresponding BEGIN TRANSACTION
}

export function toCorvusError(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = err as {
    number?: number
    code?: string
    message?: string
    originalError?: { info?: { number?: number } }
  }

  const num = e?.number ?? e?.originalError?.info?.number

  if (num && MSSQL_ERROR_MAP[num]) {
    const code = MSSQL_ERROR_MAP[num]
    return corvusError(code, e.message ?? `MSSQL Error ${num}`, {
      detail: e.message,
    })
  }

  const codeStr = e?.code?.toUpperCase() ?? ''
  if (codeStr === 'ECANCEL' || codeStr === 'ECANCELLED') {
    return corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ bởi người dùng', {
      detail: e.message,
    })
  }
  if (codeStr === 'ETIMEOUT') {
    return corvusError('QUERY_TIMEOUT', e.message ?? 'Thao tác vượt quá thời gian chờ', {
      detail: e.message,
    })
  }
  if (codeStr === 'ELOGIN') {
    return corvusError('UNAUTHORIZED', e.message ?? 'Đăng nhập không thành công', {
      detail: e.message,
    })
  }
  if (codeStr === 'ESOCKET' || codeStr === 'ECONNREFUSED' || codeStr === 'ENOTFOUND') {
    return corvusError('CONNECTION_FAILED', e.message ?? 'Không thể kết nối đến SQL Server', {
      detail: e.message,
    })
  }

  const rawMessage = e?.message ?? String(err)
  return corvusError('INTERNAL_ERROR', rawMessage, {
    detail: rawMessage,
  })
}
