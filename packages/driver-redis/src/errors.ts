import { CorvusError, corvusError } from '@corvus/contract'

export function toCorvusError(err: unknown): CorvusError {
  if (err instanceof CorvusError) return err

  const e = err as {
    name?: string
    message?: string
    command?: string
  }

  const msg = e?.message ?? String(err)
  const upper = msg.toUpperCase()

  if (upper.includes('NOAUTH') || upper.includes('WRONGPASS') || upper.includes('AUTH')) {
    return corvusError('UNAUTHORIZED', msg, { detail: msg })
  }
  if (upper.includes('NOPERM')) {
    return corvusError('FORBIDDEN', msg, { detail: msg })
  }
  if (upper.includes('WRONGTYPE')) {
    return corvusError('INVALID_INPUT', msg, { detail: msg })
  }
  if (upper.includes('SYNTAX')) {
    return corvusError('SYNTAX_ERROR', msg, { detail: msg })
  }
  if (upper.includes('READONLY')) {
    return corvusError('READ_ONLY', msg, { detail: msg })
  }
  if (upper.includes('BUSY') || upper.includes('LOCK')) {
    return corvusError('LOCK_TIMEOUT', msg, { detail: msg })
  }
  if (upper.includes('LOADING') || upper.includes('ECONNREFUSED') || upper.includes('ENOTFOUND') || upper.includes('ETIMEDOUT')) {
    return corvusError('CONNECTION_FAILED', msg, { detail: msg })
  }

  return corvusError('INTERNAL_ERROR', msg, { detail: msg })
}
