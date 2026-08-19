/**
 * Các từ khoá cho biết một field mang bí mật.
 *
 * Khớp theo kiểu CHỨA, không phải khớp đúng cả chuỗi. Bản trước dùng regex neo
 * `/^(password|secret|...)$/i` nên `sshPassphrase`, `secretKey`, `apiKeyHeader`… lọt qua
 * mà không bị che — hai test rò rỉ phát hiện điều này ngay khi được chạy thật lần đầu
 * (xem docs/04-plan/audit-2026-08-18.md).
 *
 * Nguyên tắc: thà che thừa còn hơn để lọt. Một field bị che oan chỉ gây bất tiện khi
 * debug; một mật khẩu vào log là sự cố bảo mật phải xoay khoá.
 */
const SECRET_TERMS = [
  'password',
  'passwd',
  'pwd',
  'passphrase',
  'secret',
  'token',
  'apikey',
  'accesskey',
  'privatekey',
  'authorization',
  'credential',
  'bearer',
  'cookie',
  'sessionid',
] as const

export const REDACTED = '«redacted»'

/** Bỏ mọi ký tự không phải chữ/số để `ssh_passphrase`, `sshPassphrase`, `SSH-Passphrase` cùng khớp. */
function normalizeKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

export function isSecretKey(key: string): boolean {
  const k = normalizeKey(key)
  return SECRET_TERMS.some((term) => k.includes(term))
}

/**
 * Thay giá trị của mọi field nhạy cảm bằng `«redacted»`, giữ nguyên cấu trúc.
 *
 * Bắt buộc dùng ở 4 chỗ: logger, audit log, telemetry, payload gửi cho AI provider
 * (security.md §3).
 */
export function redact<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  // Chống vòng lặp vô hạn với object tự tham chiếu (audit record có thể chứa cause chain).
  if (seen.has(value)) return '«circular»' as unknown as T
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen)) as unknown as T
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause ? redact(value.cause, seen) : undefined,
    } as unknown as T
  }

  if (value instanceof Map) {
    const out = new Map<unknown, unknown>()
    for (const [k, v] of value) {
      out.set(k, typeof k === 'string' && isSecretKey(k) ? REDACTED : redact(v, seen))
    }
    return out as unknown as T
  }

  if (value instanceof Set) {
    return new Set([...value].map((v) => redact(v, seen))) as unknown as T
  }

  if (value instanceof Date || value instanceof RegExp) return value

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = isSecretKey(k) ? REDACTED : redact(v, seen)
  }
  return out as T
}
