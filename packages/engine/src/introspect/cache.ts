export interface CacheEntry<T> {
  value: T
  expiresAt: number
  fingerprint: string
}

export class MetadataCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>()
  private readonly ttlMs: number

  constructor(ttlMs = 5 * 60 * 1000) {
    this.ttlMs = ttlMs
  }

  private buildKey(connectionId: string, resource: string, subKey = ''): string {
    return `${connectionId}:${resource}:${subKey}`
  }

  get<T>(connectionId: string, resource: string, subKey = ''): T | undefined {
    const key = this.buildKey(connectionId, resource, subKey)
    const entry = this.entries.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      return undefined
    }

    return entry.value as T
  }

  set<T>(connectionId: string, resource: string, subKey: string, value: T, fingerprint = ''): void {
    const key = this.buildKey(connectionId, resource, subKey)
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      fingerprint,
    })
  }

  invalidate(connectionId: string, resourcePattern?: string): void {
    const prefix = resourcePattern ? `${connectionId}:${resourcePattern}` : `${connectionId}:`
    for (const key of Array.from(this.entries.keys())) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key)
      }
    }
  }

  clear(): void {
    this.entries.clear()
  }
}
