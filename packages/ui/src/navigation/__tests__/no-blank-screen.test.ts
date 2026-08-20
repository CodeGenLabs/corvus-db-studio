import { describe, expect, it } from 'vitest'
import { OBJECT_KINDS, type ContentKind } from '@corvus/contract'
import { CONTENT_FOR_KIND } from '../contentForKind'

describe('No Blank Screen Guarantee (T034 / Invariant IV-E)', () => {
  const implementedContentKinds: ContentKind[] = [
    'data',
    'design',
    'definition',
    'er',
    'objectList',
    'objects',
  ]

  it('mọi ObjectKind đều có ánh xạ tới một ContentKind hợp lệ đã được hiện thực', () => {
    for (const kind of OBJECT_KINDS) {
      const contentKind = CONTENT_FOR_KIND[kind]
      expect(contentKind).toBeDefined()
      expect(implementedContentKinds).toContain(contentKind)
    }
  })

  it('các đối tượng dạng bảng/view ánh xạ về data, các đối tượng mã nguồn/schema về definition', () => {
    expect(CONTENT_FOR_KIND.table).toBe('data')
    expect(CONTENT_FOR_KIND.view).toBe('data')
    expect(CONTENT_FOR_KIND.materializedView).toBe('data')
    expect(CONTENT_FOR_KIND.collection).toBe('data')
    expect(CONTENT_FOR_KIND.keyspace).toBe('data')

    expect(CONTENT_FOR_KIND.function).toBe('definition')
    expect(CONTENT_FOR_KIND.procedure).toBe('definition')
    expect(CONTENT_FOR_KIND.trigger).toBe('definition')
    expect(CONTENT_FOR_KIND.sequence).toBe('definition')
    expect(CONTENT_FOR_KIND.index).toBe('definition')
    expect(CONTENT_FOR_KIND.domain).toBe('definition')
    expect(CONTENT_FOR_KIND.type).toBe('definition')
    expect(CONTENT_FOR_KIND.event).toBe('definition')
    expect(CONTENT_FOR_KIND.package).toBe('definition')
  })
})
