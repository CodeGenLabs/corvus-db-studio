import { describe, expect, it } from 'vitest'
import { notImplemented, NotImplementedConnection, NotImplementedIntrospector } from '../not-implemented'
import type { CapabilitySet, DriverId } from '@corvus/contract'

const MOCK_CAPS = {} as CapabilitySet

describe('notImplemented (FR-018, Audit 2026-08-18)', () => {
  it('notImplemented ném CorvusError UNSUPPORTED_FEATURE', () => {
    expect(() => notImplemented('postgres', 'customFeature')).toThrowError(/chưa hiện thực: customFeature/)
  })

  it('NotImplementedIntrospector ném UNSUPPORTED_FEATURE trên mọi phương thức', () => {
    const introspector = new NotImplementedIntrospector('postgres')

    expect(() => introspector.listDatabases()).toThrowError(/introspect.listDatabases/)
    expect(() => introspector.listSchemas()).toThrowError(/introspect.listSchemas/)
    expect(() => introspector.listObjects()).toThrowError(/introspect.listObjects/)
    expect(() => introspector.getTableMeta()).toThrowError(/introspect.getTableMeta/)
    expect(() => introspector.getDdl()).toThrowError(/introspect.getDdl/)
  })

  it('NotImplementedConnection ném UNSUPPORTED_FEATURE khi thực thi nhưng cho phép ping/close', async () => {
    const conn = new NotImplementedConnection('postgres' as DriverId, { raw: '1.0', major: 1, minor: 0, patch: 0 }, MOCK_CAPS, 'postgres')

    expect(() => conn.execute({ sql: 'SELECT 1' })).toThrowError(/execute/)
    expect(() => conn.beginTransaction()).toThrowError(/beginTransaction/)
    expect(() => conn.cancel({ id: 'handle-1' })).toThrowError(/cancel/)

    // ping và close không ném lỗi
    await expect(conn.ping()).resolves.toBe(0)
    await expect(conn.close()).resolves.toBeUndefined()
  })
})
