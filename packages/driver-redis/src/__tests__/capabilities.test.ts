import { describe, expect, it } from 'vitest'
import { REDIS_CAPABILITIES } from '../capabilities'

describe('Redis Capabilities', () => {
  it('khai báo đúng NoSQL Key-Value (keyspace: true, sql.supported: false)', () => {
    expect(REDIS_CAPABILITIES.hierarchy.hasCatalogs).toBe(false)
    expect(REDIS_CAPABILITIES.hierarchy.hasSchemas).toBe(false)
    expect(REDIS_CAPABILITIES.objects.keyspace).toBe(true)
    expect(REDIS_CAPABILITIES.objects.table).toBe(false)
    expect(REDIS_CAPABILITIES.sql.supported).toBe(false)
  })

  it('hỗ trợ streaming cursor và processMonitor', () => {
    expect(REDIS_CAPABILITIES.exec.streamingCursor).toBe(true)
    expect(REDIS_CAPABILITIES.tools.processMonitor).toBe(true)
  })
})
