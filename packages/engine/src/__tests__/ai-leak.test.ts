import { describe, expect, it } from 'vitest'
import { redact } from '../redact'

export function testAiLeak(): { passed: boolean; message?: string } {
  const sentinel = 'SENTINEL_ROW_VALUE_CONFIDENTIAL_DATA'

  const rawAiPayload = {
    prompt: 'Fix this query',
    schema: {
      tables: ['users', 'accounts'],
    },
    secretKey: sentinel,
    token: sentinel,
  }

  const sanitized = redact(rawAiPayload)
  const json = JSON.stringify(sanitized)

  if (json.includes(sentinel)) {
    return { passed: false, message: 'Sentinel confidential data leaked in AI payload!' }
  }

  return { passed: true }
}

/**
 * Bọc thành test vitest thật. Trước đây hàm trên chỉ được export mà không có runner
 * nào gọi, nên test này chưa từng chạy — xem docs/04-plan/audit-2026-08-18.md.
 */
describe('ai-leak', () => {
  it('payload AI không chứa giá trị dòng', async () => {
    const result = testAiLeak()
    expect(result.message ?? '').toBe('')
    expect(result.passed).toBe(true)
  })
})
