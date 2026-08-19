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

/**
 * Bọc thành test vitest thật. Trước đây hàm trên chỉ được export mà không có runner
 * nào gọi, nên test này chưa từng chạy — xem docs/04-plan/audit-2026-08-18.md.
 */
describe('security-password-leak', () => {
  it('mật khẩu user không rò khi tạo/sửa user', async () => {
    const result = testSecurityPasswordLeak()
    expect(result.message ?? '').toBe('')
    expect(result.passed).toBe(true)
  })
})
