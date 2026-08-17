import type { ErrorCode } from '@corvus/contract'

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
