import { describe, expect, it } from 'vitest'
import { evaluate } from '../commands/availability'
import { commandRegistry } from '../commands/registry'
import type { CapabilitySet } from '@corvus/contract'
import type { ActiveContext } from '../context/activeContext'

const SQLITE_CAPS: CapabilitySet = {
  hierarchy: { hasCatalogs: false, hasSchemas: false },
  objects: { table: true, view: true, materializedView: false, procedure: false, function: false, trigger: true, sequence: false, index: true, domain: false, type: false },
  security: { supportsUsers: false, supportsRoles: false },
  data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
} as unknown as CapabilitySet

describe('Gating Presentation Mapping Tests (T073 / FR-046 / FR-046B)', () => {
  it('Lệnh không hỗ trợ bởi engine: evaluate() trả hidden (sẽ bị lọc khỏi context menu)', () => {
    const fnCmd = commandRegistry.get('view.function')!
    const ctx: ActiveContext = {
      connectionId: 'conn-sqlite',
      connectionName: 'SQLite',
      driverId: 'sqlite',
      serverVersion: '3.42.0',
      serverEncoding: 'UTF-8',
      database: 'main',
      namespace: null,
      selection: {
        objectKind: 'table',
        targets: [],
        primaryTarget: null,
        kind: null,
        names: [],
        anchor: null,
      },
      capabilities: SQLITE_CAPS,
      connectionState: 'open',
      lastError: null,
    }

    const verdict = evaluate(fnCmd, ctx)
    // evaluate trả hidden cho engine-unsupported
    expect(verdict.state).toBe('hidden')
    expect((verdict as any).reason).toBe('engine-unsupported')
  })
})
