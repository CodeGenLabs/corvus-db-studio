export const SECRET_KEYS =
  /^(password|passwd|pwd|secret|token|apiKey|privateKey|passphrase|authorization|cookie)$/i

export function redact<T>(value: T): T {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return value as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as unknown as T
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.test(k)) {
        out[k] = '«redacted»'
      } else {
        out[k] = redact(v)
      }
    }
    return out as T
  }

  return value
}
