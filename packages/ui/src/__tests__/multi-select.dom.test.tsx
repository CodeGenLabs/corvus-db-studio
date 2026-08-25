import { describe, expect, it } from 'vitest'
import { evaluate } from '../commands/availability'
import { commandRegistry } from '../commands/registry'
import type { CapabilitySet } from '@corvus/contract'
import type { ActiveContext } from '../context/activeContext'

const FULL_CAPS: CapabilitySet = {
  hierarchy: { hasCatalogs: true, hasSchemas: true },
  objects: { table: true, view: true, materializedView: true, procedure: true, function: true, trigger: true, sequence: true, index: true, domain: true, type: true },
  security: { supportsUsers: true, supportsRoles: true },
  data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
} as unknown as CapabilitySet

describe('Multi-Select Cardinality Gating Tests (T074 / FR-050 / FR-051)', () => {
  it('Khi chọn nhiều bảng (names.length > 1): lệnh single (Design) bị disabled, lệnh multi (Drop) được enabled', () => {
    const designCmd = commandRegistry.get('object.design')!
    const dropCmd = commandRegistry.get('object.drop')!

    const ctxMulti: ActiveContext = {
      connectionId: 'conn-pg',
      connectionName: 'Postgres',
      driverId: 'postgres',
      serverVersion: '16.0',
      serverEncoding: 'UTF-8',
      database: 'postgres',
      namespace: 'public',
      selection: {
        objectKind: 'table',
        targets: ['t1', 't2'],
        primaryTarget: 't1',
        kind: 'table',
        names: ['t1', 't2'],
        anchor: 't1',
      },
      capabilities: FULL_CAPS,
      connectionState: 'open',
      lastError: null,
    }

    const designVerdict = evaluate(designCmd, ctxMulti)
    expect(designVerdict.state).toBe('disabled')
    expect((designVerdict as any).reason).toBe('multi-selection-unsupported')

    const dropVerdict = evaluate(dropCmd, ctxMulti)
    expect(dropVerdict.state).toBe('enabled')
  })
})
