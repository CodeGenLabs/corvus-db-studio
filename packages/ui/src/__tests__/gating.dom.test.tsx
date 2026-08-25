import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { Toolbar } from '../components/Toolbar'
import { useShellStore } from '../store/shell'
import type { CapabilitySet, Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

const SQLITE_CAPS: CapabilitySet = {
  hierarchy: { hasCatalogs: false, hasSchemas: false },
  objects: { table: true, view: true, materializedView: false, procedure: false, function: false, trigger: true, sequence: false, index: true, domain: false, type: false, event: false, keyspace: false, collection: false, package: false },
  security: { supportsUsers: false, supportsRoles: false },
  tools: { logicalBackup: true, physicalBackup: true, userManagement: false, roleManagement: false, processMonitor: false, serverVariables: false, dataGeneration: false, profiling: false },
  data: { supportsCount: true, supportsFilter: true, supportsSort: true, supportsPagination: true, supportsEdit: true },
} as unknown as CapabilitySet

const mockSqliteTransport: Transport = {
  status: 'ready',
  async request<TResult = unknown>(method: string): Promise<TResult> {
    if (method === 'connection.open') {
      return { capabilities: SQLITE_CAPS } as TResult
    }
    if (method === 'connection.status') {
      return { serverVersion: '3.42.0', serverEncoding: 'UTF-8' } as TResult
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

describe('Engine Capability Gating DOM Tests (T070 / US2)', () => {
  it('Chưa kết nối: các nút phụ thuộc kết nối trên Toolbar bị disabled', () => {
    useShellStore.setState({
      tabs: [],
      activeTabId: null,
    })
    const { getByTestId } = renderStudio(<Toolbar />)
    const tbTable = getByTestId('toolbar-table') as HTMLButtonElement
    const tbView = getByTestId('toolbar-view') as HTMLButtonElement
    const tbFn = getByTestId('toolbar-fn') as HTMLButtonElement
    const tbUser = getByTestId('toolbar-user') as HTMLButtonElement

    expect(tbTable.disabled).toBe(true)
    expect(tbView.disabled).toBe(true)
    expect(tbFn.disabled).toBe(true)
    expect(tbUser.disabled).toBe(true)
  })

  it('SQLite kết nối: Function bị disabled kèm lý do', async () => {
    useShellStore.setState({
      tabs: [
        {
          id: 'tab-sqlite',
          identity: {
            type: 'object',
            contentKind: 'data',
            connectionId: 'conn-sqlite',
            database: 'main',
            objectKind: 'table',
            name: 'test_table',
          },
          title: 'test_table @main',
          context: {
            connectionId: 'conn-sqlite',
            connectionName: 'Local SQLite',
            driverId: 'sqlite',
            serverVersion: '3.42.0',
            serverEncoding: 'UTF-8',
            database: 'main',
            namespace: null,
            selection: {
              objectKind: null,
              targets: [],
              primaryTarget: null,
              kind: null,
              names: [],
              anchor: null,
            },
            capabilities: SQLITE_CAPS,
            connectionState: 'open',
            lastError: null,
          },
        },
      ],
      activeTabId: 'tab-sqlite',
    })

    const { getByTestId } = renderStudio(<Toolbar />, { transport: mockSqliteTransport })
    await waitFor(() => {
      const tbFn = getByTestId('toolbar-fn') as HTMLButtonElement
      expect(tbFn.disabled).toBe(true)
      expect(tbFn.title).toBeTruthy()
    })
  })
})

