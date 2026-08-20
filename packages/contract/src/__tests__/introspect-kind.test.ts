import { describe, expect, it } from 'vitest'
import { OBJECT_KINDS } from '../capabilities'
import { introspectObjects } from '../methods/introspect'

describe('introspect.objects kind schema (T007)', () => {
  it('accepts all 14 valid OBJECT_KINDS', () => {
    for (const kind of OBJECT_KINDS) {
      const parsed = introspectObjects.params.safeParse({
        connectionId: 'conn-1',
        kind,
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.kind).toBe(kind)
      }
    }
  })

  it('accepts optional kind (undefined)', () => {
    const parsed = introspectObjects.params.safeParse({
      connectionId: 'conn-1',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.kind).toBeUndefined()
    }
  })

  it('rejects invalid kind at params validation level', () => {
    const parsed = introspectObjects.params.safeParse({
      connectionId: 'conn-1',
      kind: 'khong_co_that',
    })
    expect(parsed.success).toBe(false)
  })
})
