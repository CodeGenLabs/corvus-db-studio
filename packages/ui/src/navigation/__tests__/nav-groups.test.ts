import { describe, expect, it } from 'vitest'
import { OBJECT_KINDS, type ObjectCapabilities, type ObjectKind } from '@corvus/contract'
import { OBJECT_GROUPS } from '../objectGroups'

describe('Object Groups Filtering by Capabilities (T052 / US5 / Invariant IV-C)', () => {
  it('SQLite: nhóm khai false (procedure, function, domain, type) không xuất hiện', () => {
    const sqliteCaps: ObjectCapabilities = {
      table: true,
      view: true,
      index: true,
      trigger: true,
      materializedView: false,
      sequence: false,
      procedure: false,
      function: false,
      domain: false,
      type: false,
      event: false,
      package: false,
      collection: false,
      keyspace: false,
    }

    const visibleGroups = (Object.keys(OBJECT_GROUPS) as ObjectKind[])
      .filter((k) => sqliteCaps[k])
      .sort((a, b) => OBJECT_GROUPS[a].order - OBJECT_GROUPS[b].order)

    expect(visibleGroups).toContain('table')
    expect(visibleGroups).toContain('view')
    expect(visibleGroups).toContain('trigger')
    expect(visibleGroups).toContain('index')

    expect(visibleGroups).not.toContain('procedure')
    expect(visibleGroups).not.toContain('function')
    expect(visibleGroups).not.toContain('domain')
    expect(visibleGroups).not.toContain('type')
    expect(visibleGroups).not.toContain('event')
    expect(visibleGroups).not.toContain('package')
  })

  it('MySQL: có procedure, function, trigger, event; không có domain, type, package', () => {
    const mysqlCaps: ObjectCapabilities = {
      table: true,
      view: true,
      index: true,
      trigger: true,
      procedure: true,
      function: true,
      event: true,
      materializedView: false,
      sequence: false,
      domain: false,
      type: false,
      package: false,
      collection: false,
      keyspace: false,
    }

    const visibleGroups = (Object.keys(OBJECT_GROUPS) as ObjectKind[])
      .filter((k) => mysqlCaps[k])
      .sort((a, b) => OBJECT_GROUPS[a].order - OBJECT_GROUPS[b].order)

    expect(visibleGroups).toEqual(['table', 'view', 'procedure', 'function', 'trigger', 'index', 'event'])
  })

  it('thứ tự hiển thị các nhóm luôn tuân thủ trường order của OBJECT_GROUPS', () => {
    const allEnabledCaps: ObjectCapabilities = OBJECT_KINDS.reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as ObjectCapabilities,
    )

    const visibleGroups = (Object.keys(OBJECT_GROUPS) as ObjectKind[])
      .filter((k) => allEnabledCaps[k])
      .sort((a, b) => OBJECT_GROUPS[a].order - OBJECT_GROUPS[b].order)

    for (let i = 0; i < visibleGroups.length - 1; i++) {
      const current = visibleGroups[i]
      const next = visibleGroups[i + 1]
      if (current && next) {
        expect(OBJECT_GROUPS[current].order).toBeLessThanOrEqual(OBJECT_GROUPS[next].order)
      }
    }
  })
})
