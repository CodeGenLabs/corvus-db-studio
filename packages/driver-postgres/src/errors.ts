import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

export const PG_ERROR_MAP: Record<string, ErrorCode> = {
  '28P01': 'UNAUTHORIZED',
  '42501': 'FORBIDDEN',
  '3D000': 'NOT_FOUND',
  '42P01': 'TABLE_NOT_FOUND',
  '42703': 'COLUMN_NOT_FOUND',
  '42601': 'SYNTAX_ERROR',
  '23505': 'DUPLICATE_KEY',
  '23503': 'FOREIGN_KEY_VIOLATION',
  '57014': 'QUERY_CANCELLED',
  '53300': 'CONNECTION_FAILED',
  '08006': 'CONNECTION_FAILED',
  '08001': 'CONNECTION_FAILED',
  '40001': 'DEADLOCK',
  '55P03': 'LOCK_TIMEOUT',
  '25006': 'READ_ONLY',
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
  if (e.code && NET_ERRORS[e.code]) {
    return corvusError(NET_ERRORS[e.code]!, e.message ?? `Kết nối thất bại (${e.code})`, {
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
