import { describe, expect, it } from 'vitest'
import { commandRegistry } from '../registry'
import { evaluate } from '../availability'
import type { CapabilitySet } from '@corvus/contract'
import type { ActiveContext } from '../../context/activeContext'

const ENGINE_CAPABILITIES: Record<string, CapabilitySet> = {
  postgres: {
    hierarchy: { hasCatalogs: true, hasSchemas: true },
    objects: { table: true, view: true, materializedView: true, procedure: true, function: true, trigger: true, sequence: true, index: true, domain: true, type: true },
    security: { supportsUsers: true, supportsRoles: true },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
  mysql: {
    hierarchy: { hasCatalogs: false, hasSchemas: false },
    objects: { table: true, view: true, materializedView: false, procedure: true, function: true, trigger: true, sequence: false, index: true, domain: false, type: false, event: true },
    security: { supportsUsers: true, supportsRoles: true },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
  sqlite: {
    hierarchy: { hasCatalogs: false, hasSchemas: false },
    objects: { table: true, view: true, materializedView: false, procedure: false, function: false, trigger: true, sequence: false, index: true, domain: false, type: false },
    security: { supportsUsers: false, supportsRoles: false },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
  mssql: {
    hierarchy: { hasCatalogs: true, hasSchemas: true },
    objects: { table: true, view: true, materializedView: true, procedure: true, function: true, trigger: true, sequence: true, index: true, domain: true, type: true },
    security: { supportsUsers: true, supportsRoles: true },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
  oracle: {
    hierarchy: { hasCatalogs: false, hasSchemas: true },
    objects: { table: true, view: true, materializedView: true, procedure: true, function: true, package: true, trigger: true, sequence: true, index: true, domain: false, type: true, event: true },
    security: { supportsUsers: true, supportsRoles: true },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
  mongodb: {
    hierarchy: { hasCatalogs: true, hasSchemas: false },
    objects: { table: false, view: true, materializedView: false, procedure: false, function: true, trigger: false, sequence: false, index: true, domain: false, type: false, collection: true },
    security: { supportsUsers: true, supportsRoles: true },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
  redis: {
    hierarchy: { hasCatalogs: true, hasSchemas: false },
    objects: { table: false, view: false, materializedView: false, procedure: false, function: false, trigger: false, sequence: false, index: false, domain: false, type: false, keyspace: true },
    security: { supportsUsers: true, supportsRoles: false },
    data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
  } as unknown as CapabilitySet,
}

describe('Availability Matrix Tests across 7 engines (T069 / plan.md D-02)', () => {
  const allCmds = commandRegistry.all()

  it('đối chiếu evaluate() cho mọi lệnh với Capability Matrix cho cả 7 engine', () => {
    for (const [engine, caps] of Object.entries(ENGINE_CAPABILITIES)) {
      const ctx: ActiveContext = {
        connectionId: 'conn-test',
        connectionName: `Test ${engine}`,
        driverId: engine,
        serverVersion: '1.0.0',
        serverEncoding: 'UTF-8',
        database: 'test_db',
        namespace: 'public',
        selection: {
          objectKind: 'table',
          targets: ['test_table'],
          primaryTarget: 'test_table',
          kind: 'table',
          names: ['test_table'],
          anchor: 'test_table',
        },
        capabilities: caps,
        connectionState: 'open',
        lastError: null,
      }

      for (const cmd of allCmds) {
        const verdict = evaluate(cmd, ctx)
        if (cmd.availability.capability) {
          const capSupported = cmd.availability.capability(caps)
          if (!capSupported) {
            expect(verdict.state, `Lệnh ${cmd.id} trên ${engine} phải bị ẩn do capability`).toBe('hidden')
          }
        }
      }
    }
  })

  it('SQLite: view.function (Procedure/Function) bị hidden trên context menu', () => {
    const fnCmd = commandRegistry.get('view.function')!
    const ctx: ActiveContext = {
      connectionId: 'conn-sqlite',
      connectionName: 'SQLite Test',
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
      capabilities: ENGINE_CAPABILITIES.sqlite,
      connectionState: 'open',
      lastError: null,
    }

    const verdict = evaluate(fnCmd, ctx)
    expect(verdict.state).toBe('hidden')
  })

  it('Redis: object.design / view.table bị hidden trên context menu do không có table', () => {
    const designCmd = commandRegistry.get('object.design')!
    const ctx: ActiveContext = {
      connectionId: 'conn-redis',
      connectionName: 'Redis Test',
      driverId: 'redis',
      serverVersion: '7.2.0',
      serverEncoding: 'UTF-8',
      database: '0',
      namespace: null,
      selection: {
        objectKind: 'table',
        targets: ['foo'],
        primaryTarget: 'foo',
        kind: 'table',
        names: ['foo'],
        anchor: 'foo',
      },
      capabilities: ENGINE_CAPABILITIES.redis,
      connectionState: 'open',
      lastError: null,
    }

    const verdict = evaluate(designCmd, ctx)
    expect(verdict.state).toBe('hidden')
  })
})
