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
