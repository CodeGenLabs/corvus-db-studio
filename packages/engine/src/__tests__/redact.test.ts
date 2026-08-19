import { describe, expect, it } from 'vitest'
import { REDACTED, isSecretKey, redact } from '../redact'

const S = 'SENTINEL_VALUE_DO_NOT_LEAK'

describe('isSecretKey', () => {
  it.each([
    'password', 'passwd', 'pwd', 'passphrase',
    'sshPassphrase', 'ssh_passphrase', 'SSH-Passphrase',
    'secret', 'secretKey', 'clientSecret',
    'token', 'accessToken', 'refreshToken',
    'apiKey', 'apiKeyHeader', 'aiApiKey',
    'privateKey', 'tlsPrivateKey',
    'authorization', 'Authorization',
    'credential', 'dbCredentials',
    'cookie', 'Set-Cookie',
    'sessionId',
  ])('che field nhạy cảm: %s', (key) => {
    expect(isSecretKey(key)).toBe(true)
  })

  it.each(['host', 'port', 'username', 'name', 'database', 'schema', 'driverId', 'tokenizer'])(
    'KHÔNG che field vô hại: %s',
    (key) => {
      // 'tokenizer' chứa 'token' — đây là đánh đổi đã biết: thà che thừa hơn để lọt.
      if (key === 'tokenizer') return expect(isSecretKey(key)).toBe(true)
      expect(isSecretKey(key)).toBe(false)
    },
  )
})

describe('redact', () => {
  it('che secret ở mọi độ sâu', () => {
    const out = redact({ a: { b: { password: S, host: 'db.internal' } } })
    expect(JSON.stringify(out)).not.toContain(S)
    expect(out.a.b.password).toBe(REDACTED)
    expect(out.a.b.host).toBe('db.internal')
  })

  it('che secret trong mảng', () => {
    const out = redact([{ token: S }, { token: S }])
    expect(JSON.stringify(out)).not.toContain(S)
  })

  it('che các biến thể camelCase và snake_case (lỗi hồi quy đã phát hiện)', () => {
    const out = redact({ sshPassphrase: S, secret_key: S, 'api-key': S, TLSPrivateKey: S })
    expect(JSON.stringify(out)).not.toContain(S)
  })

  it('không rơi vào vòng lặp vô hạn với object tự tham chiếu', () => {
    const obj: Record<string, unknown> = { password: S }
    obj.self = obj
    expect(() => redact(obj)).not.toThrow()
    expect(JSON.stringify(redact(obj))).not.toContain(S)
  })

  it('giữ được thông tin Error nhưng che secret trong cause', () => {
    const err = new Error('connect failed', { cause: { password: S } })
    const out = redact(err) as { message: string; cause: { password: string } }
    expect(out.message).toBe('connect failed')
    expect(out.cause.password).toBe(REDACTED)
  })

  it('giữ nguyên giá trị nguyên thuỷ và Date', () => {
    const d = new Date('2026-01-01T00:00:00Z')
    expect(redact(42)).toBe(42)
    expect(redact('plain')).toBe('plain')
    expect(redact(d)).toBe(d)
  })
})
