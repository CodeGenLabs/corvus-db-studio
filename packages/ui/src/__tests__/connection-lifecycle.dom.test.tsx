import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { TitleBar } from '../components/TitleBar'
import { StatusBar } from '../components/StatusBar'
import { Toolbar } from '../components/Toolbar'
import type { Transport } from '@corvus/contract'
import { useShellStore } from '../store/shell'

function createMultiEngineTransport(): Transport {
  return {
    status: 'ready',
    async request<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
      const p = params as { id?: string; connectionId?: string }
      const id = p?.id || p?.connectionId

      if (method === 'connection.open') {
        const isPg = id === 'conn-postgres'
        return {
          capabilities: {
            driverId: isPg ? 'postgres' : 'mysql',
            supportsTransaction: true,
            supportsCancel: true,
            hierarchy: { hasCatalogs: true, hasSchemas: true },
          },
        } as TResult
      }
      if (method === 'connection.status') {
        const isPg = id === 'conn-postgres'
        return {
          version: isPg ? 'PostgreSQL 16.2' : 'MySQL 8.4.0',
          encoding: isPg ? 'UTF8' : 'utf8mb4',
        } as TResult
      }
      if (method === 'connection.close') {
        return { ok: true } as TResult
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

describe('T044 · Connection Lifecycle: Switch Engine & Close Connection (FR-007, US1 Scenarios 3, 5, 6)', () => {
  it('chuyển tab giữa PostgreSQL và MySQL cập nhật chrome sạch sẽ và đóng kết nối xoá ngữ cảnh', async () => {
    const transport = createMultiEngineTransport()

    // 1. Mở tab PostgreSQL
    useShellStore.setState({
      tabs: [
        {
          id: 'tab-pg',
          identity: {
            type: 'object',
            contentKind: 'data',
            connectionId: 'conn-postgres',
            database: 'pg_db',
            objectKind: 'table',
            name: 'pg_users',
          },
          title: 'pg_users @pg_db',
        },
        {
          id: 'tab-my',
          identity: {
            type: 'object',
            contentKind: 'data',
            connectionId: 'conn-mysql',
            database: 'my_db',
            objectKind: 'table',
            name: 'my_orders',
          },
          title: 'my_orders @my_db',
        },
      ],
      activeTabId: 'tab-pg',
    })

    const { unmount } = renderStudio(
      <div>
        <TitleBar />
        <Toolbar />
        <StatusBar />
      </div>,
      { transport },
    )

    await waitFor(() => {
      expect(screen.getByTestId('titlebar-title').textContent).toContain('pg_db')
      expect(screen.getByTestId('toolbar-server-info').textContent).toContain('POSTGRES')
      expect(screen.getByTestId('toolbar-server-info').textContent).toContain('PostgreSQL 16.2')
    })

    // 2. Chuyển sang tab MySQL
    useShellStore.setState({ activeTabId: 'tab-my' })

    await waitFor(() => {
      expect(screen.getByTestId('titlebar-title').textContent).toContain('my_db')
      expect(screen.getByTestId('toolbar-server-info').textContent).toContain('MYSQL')
      expect(screen.getByTestId('toolbar-server-info').textContent).toContain('MySQL 8.4.0')
      expect(screen.getByTestId('titlebar-title').textContent).not.toContain('pg_db')
    })

    // 3. Đóng tất cả tab / xoá kết nối
    useShellStore.setState({ tabs: [], activeTabId: null })

    await waitFor(() => {
      expect(screen.getByTestId('titlebar-title').textContent).toBe('Corvus DB Studio')
      expect(screen.getByTestId('toolbar-connection-status').textContent).toContain('Chưa có kết nối nào')
    })

    unmount()
  })
})
