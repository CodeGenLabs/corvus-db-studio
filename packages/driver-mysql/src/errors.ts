import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

/**
 * Bảng ánh xạ errno của MySQL / MariaDB sang ErrorCode chuẩn của Corvus (driver-spi.md §7).
 * Có ít nhất 25 mã lỗi phổ biến nhất.
 */
export const MYSQL_ERROR_MAP: Record<number, ErrorCode> = {
  // Quyền & Xác thực
  1045: 'UNAUTHORIZED', // ER_ACCESS_DENIED_ERROR
  1044: 'FORBIDDEN', // ER_DBACCESS_DENIED_ERROR

  // Đối tượng không tồn tại
  1049: 'NOT_FOUND', // ER_BAD_DB_ERROR
  1146: 'TABLE_NOT_FOUND', // ER_NO_SUCH_TABLE
  1051: 'TABLE_NOT_FOUND', // ER_BAD_TABLE_ERROR
  1054: 'COLUMN_NOT_FOUND', // ER_BAD_FIELD_ERROR
  1091: 'COLUMN_NOT_FOUND', // ER_CANT_DROP_FIELD_OR_KEY

  // Cú pháp
  1064: 'SYNTAX_ERROR', // ER_PARSE_ERROR

  // Ràng buộc & Trùng lặp
  1062: 'DUPLICATE_KEY', // ER_DUP_ENTRY
  1007: 'DUPLICATE_KEY', // ER_DB_CREATE_EXISTS
  1050: 'DUPLICATE_KEY', // ER_TABLE_EXISTS_ERROR
  1061: 'DUPLICATE_KEY', // ER_DUP_KEYNAME
  1216: 'FOREIGN_KEY_VIOLATION', // ER_NO_REFERENCED_ROW
  1217: 'FOREIGN_KEY_VIOLATION', // ER_ROW_IS_REFERENCED
  1451: 'FOREIGN_KEY_VIOLATION', // ER_ROW_IS_REFERENCED_2
  1452: 'FOREIGN_KEY_VIOLATION', // ER_NO_REFERENCED_ROW_2
  1048: 'INVALID_INPUT', // ER_BAD_NULL_ERROR
  1406: 'INVALID_INPUT', // ER_DATA_TOO_LONG

  // Huỷ & Luồng
  1317: 'QUERY_CANCELLED', // ER_QUERY_INTERRUPTED

  // Kết nối & Socket
  1053: 'CONNECTION_FAILED', // ER_SERVER_SHUTDOWN
  2002: 'CONNECTION_FAILED', // CR_CONNECTION_ERROR
  2003: 'CONNECTION_FAILED', // CR_CONN_HOST_ERROR
  2005: 'CONNECTION_FAILED', // CR_UNKNOWN_HOST
  2006: 'CONNECTION_FAILED', // CR_SERVER_GONE_ERROR
  2013: 'CONNECTION_FAILED', // CR_SERVER_LOST

  // Khoá & Giao dịch
  1205: 'LOCK_TIMEOUT', // ER_LOCK_WAIT_TIMEOUT
  1213: 'DEADLOCK', // ER_LOCK_DEADLOCK
  1290: 'READ_ONLY', // ER_OPTION_PREVENTS_STATEMENT
}

export function mapMysqlError(errno?: number): ErrorCode {
  if (errno === undefined) return 'INTERNAL_ERROR'
  return MYSQL_ERROR_MAP[errno] ?? 'INTERNAL_ERROR'
}

/**
 * Chuyển lỗi từ `mysql2` hoặc lỗi mạng Node thành CorvusError (driver-spi.md §7).
 * Đảm bảo không rò rỉ secret / password trong message hoặc detail.
 */
export function mysqlErrorToCorvus(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = err as {
    code?: string
    errno?: number
    sqlState?: string
    sqlMessage?: string
    message?: string
  }

  // Lỗi mạng tầng Node (ECONNREFUSED, ENOTFOUND, ETIMEDOUT...)
  const NET_ERRORS: Record<string, ErrorCode> = {
    ECONNREFUSED: 'CONNECTION_FAILED',
    ENOTFOUND: 'CONNECTION_FAILED',
    EHOSTUNREACH: 'CONNECTION_FAILED',
    ENETUNREACH: 'CONNECTION_FAILED',
    ECONNRESET: 'CONNECTION_FAILED',
    EPIPE: 'CONNECTION_FAILED',
    EAI_AGAIN: 'CONNECTION_FAILED',
    ETIMEDOUT: 'QUERY_TIMEOUT',
    PROTOCOL_CONNECTION_LOST: 'CONNECTION_FAILED',
    HANDSHAKE_ERROR: 'CONNECTION_FAILED',
  }

  const mappedNetError = e.code ? NET_ERRORS[e.code] : undefined
  if (mappedNetError && e.code) {
    return corvusError(mappedNetError, e.message ?? `Kết nối MySQL thất bại (${e.code})`, {
      detail: e.code,
    })
  }

  // Lỗi MySQL có errno số
  if (typeof e.errno === 'number') {
    const code = mapMysqlError(e.errno)
    const msg = e.sqlMessage ?? e.message ?? `MySQL error (${e.errno})`
    return corvusError(code, msg, {
      detail: e.sqlState ? `SQLSTATE ${e.sqlState} (errno ${e.errno})` : `errno ${e.errno}`,
    })
  }

  // Lỗi chuỗi không xác định
  const msg = e.message ?? String(err)
  const code = /interrupted|cancelled|killed/i.test(msg)
    ? 'QUERY_CANCELLED'
    : /timeout/i.test(msg)
      ? 'QUERY_TIMEOUT'
      : /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|socket|PROTOCOL_CONNECTION_LOST/i.test(msg)
        ? 'CONNECTION_FAILED'
        : 'INTERNAL_ERROR'

  return corvusError(code, msg)
}
