import { redact } from '../redact'

export function testSecurityLeak(): { passed: boolean; message?: string } {
  const sentinel = 'SENTINEL_AUTH_BEARER_TOKEN_ABC'

  const auditEntry = {
    id: 'audit-99',
    ts: '2026-08-17T12:00:00Z',
    actorId: 'usr-1',
    actorName: 'admin',
    action: 'security.applyGrant',
    outcome: 'ok',
    durationMs: 15,
    level: 'full',
    authorization: sentinel,
    cookie: sentinel,
    apiKey: sentinel,
  }

  const sanitized = redact(auditEntry)
  const json = JSON.stringify(sanitized)

  if (json.includes(sentinel)) {
    return { passed: false, message: 'Sentinel secret leaked in audit log payload!' }
  }

  return { passed: true }
}
