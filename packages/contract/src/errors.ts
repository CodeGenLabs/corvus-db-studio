export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'CONNECTION_FAILED'
  | 'QUERY_TIMEOUT'
  | 'QUERY_CANCELLED'
  | 'SYNTAX_ERROR'
  | 'TABLE_NOT_FOUND'
  | 'COLUMN_NOT_FOUND'
  | 'DUPLICATE_KEY'
  | 'FOREIGN_KEY_VIOLATION'
  | 'LOCK_TIMEOUT'
  | 'DEADLOCK'
  | 'READ_ONLY'
  | 'PREVIEW_TOKEN_EXPIRED'
  | 'PREVIEW_TOKEN_INVALID'
  | 'UNSUPPORTED_FEATURE'
  | 'INTERNAL_ERROR'

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
