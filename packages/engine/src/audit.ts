import type { MethodName } from '@corvus/contract'
import { redact } from './redact'

export type AuditLevel = 'none' | 'metadata' | 'full'

export interface AuditEntry {
  id: string
  ts: string
  actorId: string
  actorName: string
  action: MethodName
  connectionId?: string
  target?: string
  outcome: 'ok' | 'denied' | 'error'
  durationMs: number
  level: AuditLevel
  sql?: string
  rowsAffected?: number
  clientIp?: string
  userAgent?: string
  errorMessage?: string
}

export interface AuditLogger {
  log(entry: AuditEntry): Promise<void>
}

export class InMemoryAuditLogger implements AuditLogger {
  readonly entries: AuditEntry[] = []

  async log(entry: AuditEntry): Promise<void> {
    const sanitized = redact(entry)
    this.entries.push(sanitized)
  }
}
