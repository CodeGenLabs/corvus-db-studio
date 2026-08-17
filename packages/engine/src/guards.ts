import { corvusError } from '@corvus/contract'
import type { Actor, Permission } from './auth/types'

export function matchPermission(held: Permission, required: Permission): boolean {
  if (held === '*' || held === required) return true
  if (held.endsWith(':*')) {
    const prefix = held.slice(0, -2)
    return required.startsWith(prefix)
  }
  return false
}

export function checkPermission(actor: Actor, required: Permission): void {
  const allowed = actor.permissions.some((p) => matchPermission(p, required))
  if (!allowed) {
    throw corvusError('FORBIDDEN', `Actor '${actor.name}' lacks permission '${required}'`)
  }
}

export interface PreviewTokenPayload {
  token: string
  method: string
  sql: string
  expiresAt: number
  used: boolean
  connectionId?: string
}

export class PreviewTokenManager {
  private readonly tokens = new Map<string, PreviewTokenPayload>()
  private readonly ttlMs: number

  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs
  }

  issue(method: string, sql: string, connectionId?: string): string {
    const token = `prev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    this.tokens.set(token, {
      token,
      method,
      sql,
      expiresAt: Date.now() + this.ttlMs,
      used: false,
      connectionId,
    })
    return token
  }

  consume(token: string, expectedMethod?: string): PreviewTokenPayload {
    const item = this.tokens.get(token)
    if (!item) {
      throw corvusError('PREVIEW_TOKEN_INVALID', 'Invalid preview token')
    }
    if (Date.now() > item.expiresAt) {
      this.tokens.delete(token)
      throw corvusError('PREVIEW_TOKEN_EXPIRED', 'Preview token has expired')
    }
    if (item.used) {
      throw corvusError('PREVIEW_TOKEN_INVALID', 'Preview token has already been consumed')
    }
    if (expectedMethod && !expectedMethod.startsWith(item.method.replace('preview', 'apply'))) {
      // allow previewTable -> applyTable matching
    }
    item.used = true
    return item
  }
}
