import { describe, expect, it } from 'vitest'
import { OBJECT_KINDS } from '@corvus/contract'
import { OBJECT_GROUPS } from '../objectGroups'
import { CONTENT_FOR_KIND } from '../contentForKind'

describe('Object group & content mappings (T011-T013)', () => {
  it('covers all 14 OBJECT_KINDS in OBJECT_GROUPS (Invariant IV-D)', () => {
    const orders = new Set<number>()
    for (const kind of OBJECT_KINDS) {
      const group = OBJECT_GROUPS[kind]
      expect(group).toBeDefined()
      expect(typeof group.labelKey).toBe('string')
      expect(group.labelKey.length).toBeGreaterThan(0)
      expect(typeof group.order).toBe('number')
      expect(orders.has(group.order)).toBe(false)
      orders.add(group.order)
    }
    expect(orders.size).toBe(OBJECT_KINDS.length)
  })

  it('covers all 14 OBJECT_KINDS in CONTENT_FOR_KIND (Invariant IV-E / FR-015)', () => {
    const validContentKinds = ['objectList', 'data', 'design', 'definition', 'er']
    for (const kind of OBJECT_KINDS) {
      const contentKind = CONTENT_FOR_KIND[kind]
      expect(contentKind).toBeDefined()
      expect(validContentKinds).toContain(contentKind)
    }
  })
})
