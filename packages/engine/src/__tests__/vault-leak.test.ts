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
