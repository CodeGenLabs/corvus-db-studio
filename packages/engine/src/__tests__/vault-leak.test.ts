import { describe, expect, it } from 'vitest'
import { EnvelopeVault } from '@corvus/storage/vault'
import { redact } from '../redact'

export async function testVaultLeak(): Promise<{ passed: boolean; message?: string }> {
  const sentinel = 'SENTINEL_SUPER_SECRET_PASSWORD_12345!'
  const vault = new EnvelopeVault('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')

  await vault.set({ kind: 'db-password', ownerId: 'usr-1', connectionId: 'conn-1' }, sentinel)

  const auditRecord = {
    action: 'vault.set',
    password: sentinel,
    meta: {
      deep: {
        token: sentinel,
        user: 'admin',
      },
    },
  }

  const sanitized = redact(auditRecord)
  const json = JSON.stringify(sanitized)

  if (json.includes(sentinel)) {
    return { passed: false, message: 'Sentinel leaked in redacted audit output!' }
  }

  return { passed: true }
}

/**
 * Bọc thành test vitest thật. Trước đây hàm trên chỉ được export mà không có runner
 * nào gọi, nên test này chưa từng chạy — xem docs/04-plan/audit-2026-08-18.md.
 */
describe('vault-leak', () => {
  it('secret không rò rỉ qua redact khi ghi audit', async () => {
    const result = await testVaultLeak()
    expect(result.message ?? '').toBe('')
    expect(result.passed).toBe(true)
  })
})
