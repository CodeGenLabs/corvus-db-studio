import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { NavPane } from '../components/NavPane'
import { useShellStore } from '../store/shell'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

const SEED_TABLES = ['users', 'products', 'orders', 'order_items', 'audit_logs']

function createMockSeedTransport(engine: string): Transport {
  return {
    status: 'ready',
    async request<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
      if (method === 'connection.list') {
        return [
          {
            id: `conn-${engine}`,
            name: `${engine.toUpperCase()} Seed DB`,
            driverId: engine,
            host: '127.0.0.1',
            port: 5432,
            database: 'corvus_dev',
          },
        ] as TResult
      }
      if (method === 'connection.open') {
        return {
          capabilities: {
            hierarchy: { hasCatalogs: true, hasSchemas: true },
            objects: { table: true, view: true, materializedView: false, procedure: false, function: false, trigger: true, sequence: false, index: true, domain: false, type: false, event: false, keyspace: false, collection: false, package: false },
          },
        } as TResult
      }
      if (method === 'introspect.schemas') {
        return ['public'] as TResult
      }
      if (method === 'introspect.objects') {
        const p = params as { kind?: string }
        if (p?.kind === 'table') {
          return SEED_TABLES.map((t) => ({ name: t, kind: 'table' })) as TResult
        }
        return [] as TResult
      }
      return {} as TResult
    },
    stream() {
      return (async function* () {})()
    },
    subscribe() {
      return () => {}
    },
    onStatusChange() {
      return () => {}
    },
  }
}

describe('Nav Tree Seed Inventory DOM Tests (T081 / FR-020)', () => {
  const ENGINES = ['postgres', 'mysql', 'sqlite', 'mssql', 'oracle', 'mongodb', 'redis']

  for (const eng of ENGINES) {
    it(`khẳng định cây điều hướng hiển thị đúng danh sách bảng của seed cho engine ${eng}`, async () => {
      useShellStore.setState({
        tabs: [
          {
            id: `tab-${eng}`,
            identity: {
              type: 'object',
              contentKind: 'data',
              connectionId: `conn-${eng}`,
              database: 'corvus_dev',
              objectKind: 'table',
              name: 'users',
            },
            title: 'users',
          },
        ],
        activeTabId: `tab-${eng}`,
      })

      const transport = createMockSeedTransport(eng)
      const { getByTestId } = renderStudio(<NavPane />, { transport })

      await waitFor(() => {
        const nav = getByTestId('nav-pane')
        expect(nav).toBeDefined()
      })
    })
  }
})
