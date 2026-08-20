import { CorvusError, corvusError, type ErrorCode } from '@corvus/contract'

export const MONGO_ERROR_MAP: Record<number, ErrorCode> = {
  // ── Quyền truy cập & Xác thực ─────────────────────────────────────────────
  13: 'UNAUTHORIZED', // Unauthorized
  18: 'UNAUTHORIZED', // AuthenticationFailed
  31: 'UNAUTHORIZED', // RoleNotFound
  33: 'UNAUTHORIZED', // UserNotFound

  // ── Namespace & Collection ────────────────────────────────────────────────
  26: 'NOT_FOUND', // NamespaceNotFound
  173: 'TABLE_NOT_FOUND', // CollectionNotFound
  48: 'DUPLICATE_KEY', // NamespaceExists

  // ── Cú pháp & Ngữ nghĩa & Validation ──────────────────────────────────────
  2: 'INVALID_INPUT', // BadValue
  9: 'INVALID_INPUT', // FailedToParse
  14: 'INVALID_INPUT', // TypeMismatch
  121: 'INVALID_INPUT', // DocumentValidationFailure

  // ── Ràng buộc dữ liệu ─────────────────────────────────────────────────────
  11000: 'DUPLICATE_KEY', // DuplicateKey
  11001: 'DUPLICATE_KEY', // DuplicateKey (sharded)

  // ── Huỷ & Timeout ─────────────────────────────────────────────────────────
  50: 'QUERY_TIMEOUT', // MaxTimeMSExpired
  11600: 'QUERY_CANCELLED', // Interrupted
  11601: 'QUERY_CANCELLED', // InterruptedAtShutdown
  11602: 'QUERY_CANCELLED', // InterruptedDueToReplStateChange
  24: 'LOCK_TIMEOUT', // LockTimeout
  112: 'DEADLOCK', // WriteConflict
}

export function toCorvusError(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = err as {
    code?: number
    name?: string
    message?: string
  }

  if (e?.code !== undefined && e.code in MONGO_ERROR_MAP) {
    const code = MONGO_ERROR_MAP[e.code]!
    return corvusError(code, e.message ?? `Mongo Error ${e.code}`, {
      detail: e.message,
    })
  }

  if (e?.name === 'MongoServerSelectionError' || e?.name === 'MongoNetworkError' || e?.name === 'MongoTopologyClosedError') {
    return corvusError('CONNECTION_FAILED', e.message ?? 'Không thể kết nối tới máy chủ MongoDB', {
      detail: e.message,
    })
  }

  const rawMessage = e?.message ?? String(err)
  return corvusError('INTERNAL_ERROR', rawMessage, {
    detail: rawMessage,
  })
}
