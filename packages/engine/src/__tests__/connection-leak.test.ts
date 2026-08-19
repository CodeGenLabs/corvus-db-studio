import { describe, expect, it } from 'vitest'
import { redact } from '../redact'

export function testConnectionLeak(): { passed: boolean; message?: string } {
  const sentinel = 'SENTINEL_DB_SECRET_KEY_999'

  const connectionProfile = {
    id: 'conn-1',
    name: 'Production DB',
    host: 'db.prod.internal',
    password: sentinel,
    sshPassphrase: sentinel,
    privateKey: sentinel,
  }

  const sanitized = redact(connectionProfile)
  const json = JSON.stringify(sanitized)

  if (json.includes(sentinel)) {
    return { passed: false, message: 'Sentinel secret leaked in connection profile serialization!' }
  }

  return { passed: true }
}

/**
 * Bọc thành test vitest thật. Trước đây hàm trên chỉ được export mà không có runner
 * nào gọi, nên test này chưa từng chạy — xem docs/04-plan/audit-2026-08-18.md.
 */
describe('connection-leak', () => {
  it('mật khẩu DB không rò qua connection.*', async () => {
    const result = testConnectionLeak()
    expect(result.message ?? '').toBe('')
    expect(result.passed).toBe(true)
  })
})
