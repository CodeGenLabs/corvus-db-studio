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
