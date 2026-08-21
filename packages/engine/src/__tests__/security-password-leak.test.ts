import { describe, expect, it } from 'vitest'
import { redact } from '../redact'
import { generateUserSql } from '@corvus/sql'

export function testSecurityPasswordLeak(): { passed: boolean; message?: string } {
  const plainPassword = 'SuperSecretUserPassword999!'

  // 1. Test DDL generation with maskPassword = true (for user preview)
  const ddlPreview = generateUserSql(
    'create',
    {
      username: 'analyst_bob',
      password: plainPassword,
    },
    'postgres',
    true,
  )

  if (ddlPreview.includes(plainPassword)) {
    return { passed: false, message: 'Plaintext password leaked in preview SQL statement!' }
  }

  // 2. Test redact filter on user objects
  const userPayload = {
    username: 'developer_alice',
    password: plainPassword,
    secret: plainPassword,
    token: plainPassword,
    role: 'developer',
  }

  const sanitized = redact(userPayload)
  const json = JSON.stringify(sanitized)

  if (json.includes(plainPassword)) {
    return { passed: false, message: 'Password leaked in serialized redact output!' }
  }

  return { passed: true }
}

describe('security-password-leak (SR-003, Điều cấm #6)', () => {
  it('mật khẩu user không rò khi tạo/sửa user', async () => {
    const result = testSecurityPasswordLeak()
    expect(result.message ?? '').toBe('')
    expect(result.passed).toBe(true)
  })

  it('redact() che toàn bộ mật khẩu trong connection configs của 7 engine', () => {
    const secret = 'VerySecretDbPassword123!'
    const engines = ['postgres', 'mysql', 'mariadb', 'mssql', 'oracle', 'mongodb', 'redis'] as const

    for (const engine of engines) {
      const connConfig = {
        id: `conn-${engine}`,
        driverId: engine,
        name: `Dev ${engine}`,
        host: '127.0.0.1',
        port: 5432,
        user: 'corvus',
        password: secret,
        auth: {
          password: secret,
          passphrase: secret,
          privateKey: secret,
        },
      }

      const sanitized = redact(connConfig)
      const json = JSON.stringify(sanitized)
      expect(json).not.toContain(secret)
      expect(sanitized.password).toBe('«redacted»')
      expect(sanitized.auth.password).toBe('«redacted»')
      expect(sanitized.auth.passphrase).toBe('«redacted»')
      expect(sanitized.auth.privateKey).toBe('«redacted»')
    }
  })
})
