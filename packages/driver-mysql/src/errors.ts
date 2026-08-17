import type { ErrorCode } from '@corvus/contract'

export const MYSQL_ERROR_MAP: Record<number, ErrorCode> = {
  1045: 'UNAUTHORIZED',
  1044: 'FORBIDDEN',
  1049: 'NOT_FOUND',
  1146: 'TABLE_NOT_FOUND',
  1054: 'COLUMN_NOT_FOUND',
  1064: 'SYNTAX_ERROR',
  1062: 'DUPLICATE_KEY',
  1216: 'FOREIGN_KEY_VIOLATION',
  1217: 'FOREIGN_KEY_VIOLATION',
  1451: 'FOREIGN_KEY_VIOLATION',
  1452: 'FOREIGN_KEY_VIOLATION',
  1317: 'QUERY_CANCELLED',
  2002: 'CONNECTION_FAILED',
  2003: 'CONNECTION_FAILED',
  1205: 'LOCK_TIMEOUT',
  1213: 'DEADLOCK',
  1290: 'READ_ONLY',
}

export function mapMysqlError(errno?: number): ErrorCode {
  if (errno === undefined) return 'INTERNAL_ERROR'
  return MYSQL_ERROR_MAP[errno] ?? 'INTERNAL_ERROR'
}
