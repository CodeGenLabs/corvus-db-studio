import { describe, expect, it } from 'vitest'
import { MONGO_CAPABILITIES } from '../capabilities'

describe('MongoDB Capabilities', () => {
  it('khai báo đúng NoSQL Document (collection: true, sql.supported: false)', () => {
    expect(MONGO_CAPABILITIES.hierarchy.hasCatalogs).toBe(false)
    expect(MONGO_CAPABILITIES.hierarchy.hasSchemas).toBe(false)
    expect(MONGO_CAPABILITIES.objects.collection).toBe(true)
    expect(MONGO_CAPABILITIES.objects.table).toBe(false)
    expect(MONGO_CAPABILITIES.sql.supported).toBe(false)
  })

  it('hỗ trợ streaming cursor và cancel', () => {
    expect(MONGO_CAPABILITIES.exec.streamingCursor).toBe(true)
    expect(MONGO_CAPABILITIES.exec.cancelStatement).toBe(true)
  })
})
