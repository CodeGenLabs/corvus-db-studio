import { describe, expect, it } from 'vitest'
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

/**
 * Bọc thành test vitest thật. Trước đây hàm trên chỉ được export mà không có runner
 * nào gọi, nên test này chưa từng chạy — xem docs/04-plan/audit-2026-08-18.md.
 */
describe('security-leak', () => {
  it('thông tin quyền không rò qua log', async () => {
    const result = testSecurityLeak()
    expect(result.message ?? '').toBe('')
    expect(result.passed).toBe(true)
  })
})
