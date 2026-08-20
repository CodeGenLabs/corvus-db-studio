/**
 * Danh sách mã lỗi ở dạng DỮ LIỆU, không chỉ là kiểu.
 *
 * Cần bản runtime để transport kiểm được mã trước khi đưa lên dây: khi `code` chỉ là kiểu,
 * một mã không tồn tại (`'CONNECTION_LOST'`) vẫn lọt qua compile và UI tra `error.<code>`
 * ra chuỗi rỗng. `ErrorCode` được suy ra từ mảng này nên hai bên không thể lệch nhau.
 */
export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_INPUT',
  'CONNECTION_FAILED',
  'QUERY_TIMEOUT',
  'QUERY_CANCELLED',
  'SYNTAX_ERROR',
  'TABLE_NOT_FOUND',
  'COLUMN_NOT_FOUND',
  'DUPLICATE_KEY',
  'FOREIGN_KEY_VIOLATION',
  'LOCK_TIMEOUT',
  'DEADLOCK',
  'READ_ONLY',
  'PREVIEW_TOKEN_EXPIRED',
  'PREVIEW_TOKEN_INVALID',
  'UNSUPPORTED_FEATURE',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

/** `code` này có phải mã hợp lệ của contract không? */
export function isErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && (ERROR_CODES as readonly string[]).includes(code)
}

export interface CorvusErrorOptions {
  detail?: string
  line?: number
  column?: number
  cause?: unknown
  i18nKey?: string
}

export class CorvusError extends Error {
  readonly code: ErrorCode
  readonly i18nKey: string
  readonly detail?: string
  readonly line?: number
  readonly column?: number

  constructor(code: ErrorCode, message: string, opts?: CorvusErrorOptions) {
    super(message, { cause: opts?.cause })
    this.name = 'CorvusError'
    this.code = code
    this.i18nKey = opts?.i18nKey ?? `error.${code.toLowerCase()}`
    this.detail = opts?.detail
    this.line = opts?.line
    this.column = opts?.column
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      i18nKey: this.i18nKey,
      detail: this.detail,
      line: this.line,
      column: this.column,
    }
  }
}

export function corvusError(code: ErrorCode, message: string, opts?: CorvusErrorOptions): CorvusError {
  return new CorvusError(code, message, opts)
}
