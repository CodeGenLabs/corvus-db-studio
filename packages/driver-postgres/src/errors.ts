import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

export const PG_ERROR_MAP: Record<string, ErrorCode> = {
  // ── Quyền truy cập & Xác thực ─────────────────────────────────────────────
  '28P01': 'UNAUTHORIZED',
  '28000': 'UNAUTHORIZED',
  '42501': 'FORBIDDEN',

  // ── Database & Schema & Table & Column ────────────────────────────────────
  '3D000': 'NOT_FOUND',
  '3F000': 'NOT_FOUND',
  '42P01': 'TABLE_NOT_FOUND',
  '42703': 'COLUMN_NOT_FOUND',
  '42883': 'NOT_FOUND', // Undefined function
  '42704': 'NOT_FOUND', // Undefined object
  '42P07': 'DUPLICATE_KEY', // Duplicate table

  // ── Cú pháp & Ngữ nghĩa & Cardinality ─────────────────────────────────────
  '42601': 'SYNTAX_ERROR',
  '42702': 'INVALID_INPUT', // Ambiguous column
  '42846': 'INVALID_INPUT', // Cannot coerce
  '42804': 'INVALID_INPUT', // Datatype mismatch
  '21000': 'INVALID_INPUT', // Cardinality violation (subquery returns > 1 row)

  // ── Ràng buộc dữ liệu ─────────────────────────────────────────────────────
  '23505': 'DUPLICATE_KEY',
  '23503': 'FOREIGN_KEY_VIOLATION',
  '23502': 'INVALID_INPUT', // Not null violation
  '23514': 'INVALID_INPUT', // Check violation
  '23P01': 'INVALID_INPUT', // Exclusion violation

  // ── Lỗi kiểu dữ liệu & Giá trị ─────────────────────────────────────────────
  '22012': 'INVALID_INPUT', // Division by zero
  '22001': 'INVALID_INPUT', // String data right truncation
  '22003': 'INVALID_INPUT', // Numeric value out of range
  '22007': 'INVALID_INPUT', // Invalid datetime format
  '22P02': 'INVALID_INPUT', // Invalid text representation
  '22008': 'INVALID_INPUT', // Datetime field overflow

  // ── Huỷ & Timeout ─────────────────────────────────────────────────────────
  '57014': 'QUERY_CANCELLED',
  '55P03': 'LOCK_TIMEOUT',
  '57P01': 'CONNECTION_FAILED', // Admin shutdown
  '57P02': 'CONNECTION_FAILED', // Crash shutdown
  '57P03': 'CONNECTION_FAILED', // Cannot connect now

  // ── Kết nối & Tài nguyên ──────────────────────────────────────────────────
  '53300': 'CONNECTION_FAILED',
  '53100': 'CONNECTION_FAILED', // Disk full
  '53200': 'CONNECTION_FAILED', // Out of memory
  '08006': 'CONNECTION_FAILED',
  '08001': 'CONNECTION_FAILED',
  '08003': 'CONNECTION_FAILED',
  '08004': 'CONNECTION_FAILED',

  // ── Tranh chấp & Transaction ──────────────────────────────────────────────
  '40001': 'DEADLOCK',
  '40P01': 'DEADLOCK',
  '25006': 'READ_ONLY',
  '25P01': 'INVALID_INPUT', // No active sql transaction / savepoint outside tx
  '25P02': 'INVALID_INPUT', // In failed sql transaction
}

export function mapPgError(sqlState?: string): ErrorCode {
  if (!sqlState) return 'INTERNAL_ERROR'
  return PG_ERROR_MAP[sqlState] ?? 'INTERNAL_ERROR'
}

/**
 * Chuyển lỗi thô từ `pg` thành CorvusError.
 *
 * Giữ `position` để UI highlight đúng vị trí lỗi cú pháp trong editor
 * (SPEC-04 FR-04.26). `pg` trả `position` là offset 1-based trong chuỗi SQL.
 */
export function pgErrorToCorvus(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = err as {
    code?: string
    message?: string
    detail?: string
    position?: string
    hint?: string
    severity?: string
  }

  // Lỗi tầng mạng của Node CÓ `code` (ECONNREFUSED, ENOTFOUND…) nhưng đó KHÔNG phải
  // SQLSTATE. SQLSTATE của PostgreSQL luôn đúng 5 ký tự chữ-số. Không phân biệt thì
  // "connection refused" — lỗi phổ biến nhất — bị báo thành INTERNAL_ERROR.
  const NET_ERRORS: Record<string, ErrorCode> = {
    ECONNREFUSED: 'CONNECTION_FAILED',
    ENOTFOUND: 'CONNECTION_FAILED',
    EHOSTUNREACH: 'CONNECTION_FAILED',
    ENETUNREACH: 'CONNECTION_FAILED',
    ECONNRESET: 'CONNECTION_FAILED',
    EPIPE: 'CONNECTION_FAILED',
    EAI_AGAIN: 'CONNECTION_FAILED',
    ETIMEDOUT: 'QUERY_TIMEOUT',
  }
  const netCode = e.code ? NET_ERRORS[e.code] : undefined
  if (netCode !== undefined) {
    return corvusError(netCode, e.message ?? `Kết nối thất bại (${e.code})`, {
      detail: e.code,
      cause: err,
    })
  }

  // Lỗi tầng socket không có mã nào cả.
  if (!e.code || !/^[0-9A-Za-z]{5}$/.test(e.code)) {
    const msg = e.message ?? String(err)
    const code = /timeout/i.test(msg)
      ? 'QUERY_TIMEOUT'
      : /ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|socket/i.test(msg)
        ? 'CONNECTION_FAILED'
        : 'INTERNAL_ERROR'
    return corvusError(code, msg, { cause: err })
  }

  const offset = e.position ? Number(e.position) : undefined
  return corvusError(mapPgError(e.code), e.message ?? `PostgreSQL error ${e.code}`, {
    detail: [e.detail, e.hint].filter(Boolean).join(' · ') || undefined,
    // `column` mang offset ký tự; engine dịch sang line/col khi cần.
    column: Number.isFinite(offset) ? offset : undefined,
    cause: err,
  })
}
