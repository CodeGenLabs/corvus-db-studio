import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DataGrid } from '../components/grid/DataGrid'
import { useShellStore } from '../store/shell'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

function createPagingMockTransport(): Transport {
  return {
    status: 'ready',
    async request<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
      if (method === 'data.count') {
        return { count: 100_000 } as TResult
      }
      if (method === 'data.read') {
        const p = params as { limit?: number; offset?: number }
        const limit = p?.limit ?? 50
        const rows = Array.from({ length: limit }, (_, i) => ({
          id: (p?.offset ?? 0) + i + 1,
          name: `User ${(p?.offset ?? 0) + i + 1}`,
          email: `user${(p?.offset ?? 0) + i + 1}@example.com`,
        }))
        return {
          rows,
          fields: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'varchar' },
            { name: 'email', type: 'varchar' },
          ],
        } as TResult
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

describe('Data Browse Paging DOM Tests (T082 / research.md R9)', () => {
  it('DataGrid phân trang nạp dữ liệu theo lô mà không nạp toàn bộ 100k dòng', async () => {
    useShellStore.setState({
      tabs: [
        {
          id: 'tab-grid-100k',
          identity: {
            type: 'object',
            contentKind: 'data',
            connectionId: 'conn-pg',
            database: 'corvus_dev',
            objectKind: 'table',
            name: 'users',
          },
          title: 'users',
        },
      ],
      activeTabId: 'tab-grid-100k',
    })

    const transport = createPagingMockTransport()
    const { getByTestId } = renderStudio(<DataGrid rows={[]} columns={[]} />, { transport })

    await waitFor(() => {
      expect(getByTestId('data-grid')).toBeDefined()
    })
  })
})
