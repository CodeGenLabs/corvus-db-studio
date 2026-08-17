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
