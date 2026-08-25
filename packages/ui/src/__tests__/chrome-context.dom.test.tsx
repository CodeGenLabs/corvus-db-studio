import { describe, expect, it, afterEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { TitleBar } from '../components/TitleBar'
import { StatusBar } from '../components/StatusBar'
import { Toolbar } from '../components/Toolbar'
import type { Transport } from '@corvus/contract'
import { useShellStore } from '../store/shell'

afterEach(() => {
  cleanup()
})

const ENGINES = [
  { driverId: 'postgres', name: 'PostgreSQL Local Dev', version: 'PostgreSQL 16.2', encoding: 'UTF8', db: 'corvus_dev', supportsTx: true },
  { driverId: 'mysql', name: 'MySQL Local Dev', version: 'MySQL 8.4.0', encoding: 'utf8mb4', db: 'corvus_dev', supportsTx: true },
  { driverId: 'mariadb', name: 'MariaDB Local Dev', version: 'MariaDB 11.3.2', encoding: 'utf8mb4', db: 'corvus_dev', supportsTx: true },
  { driverId: 'mssql', name: 'SQL Server Local Dev', version: 'Microsoft SQL Server 2022', encoding: 'UTF-8', db: 'corvus_dev', supportsTx: true },
  { driverId: 'oracle', name: 'Oracle Local Dev', version: 'Oracle Database 23c Free', encoding: 'AL32UTF8', db: 'FREEPDB1', supportsTx: true },
  { driverId: 'sqlite', name: 'SQLite Local Dev', version: 'SQLite 3.45.2', encoding: 'UTF-8', db: 'main', supportsTx: true },
  { driverId: 'mongodb', name: 'MongoDB Local Dev', version: 'MongoDB 7.0.8', encoding: 'UTF-8', db: 'corvus_dev', supportsTx: false },
  { driverId: 'redis', name: 'Redis Local Dev', version: 'Redis 7.2.5', encoding: 'UTF-8', db: '0', supportsTx: false },
]

function createMockEngineTransport(engineInfo: (typeof ENGINES)[number]): Transport {
  return {
    status: 'ready',
    async request<TResult = unknown>(method: string, _params?: unknown): Promise<TResult> {
      if (method === 'connection.open') {
        return {
          capabilities: {
            driverId: engineInfo.driverId,
            supportsTransaction: engineInfo.supportsTx,
            supportsCancel: true,
            hierarchy: { hasCatalogs: true, hasSchemas: true },
          },
        } as TResult
      }
      if (method === 'connection.status') {
        return {
          version: engineInfo.version,
          encoding: engineInfo.encoding,
        } as TResult
      }
      if (method === 'connection.list') {
        return [
          {
            id: `conn-${engineInfo.driverId}`,
            name: engineInfo.name,
            driverId: engineInfo.driverId,
            host: '127.0.0.1',
            port: 5432,
            database: engineInfo.db,
          },
        ] as TResult
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

describe('T041 · Chrome Context Reflection across 7 Engines (FR-003, FR-004, SC-001)', () => {
  for (const eng of ENGINES) {
    it(`phản ánh đúng phiên bản và database thật cho engine ${eng.driverId}`, async () => {
      const connId = `conn-${eng.driverId}`
      const transport = createMockEngineTransport(eng)

      // Set shell store with active tab pointing to this connection
      useShellStore.setState({
        tabs: [
          {
            id: `tab-${eng.driverId}`,
            identity: {
              type: 'object',
              contentKind: 'data',
              connectionId: connId,
              database: eng.db,
              objectKind: 'table',
              name: 'test_table',
            },
            title: `test_table @${eng.db}`,
          },
        ],
        activeTabId: `tab-${eng.driverId}`,
      })

      renderStudio(
        <div>
          <TitleBar />
          <Toolbar />
          <StatusBar />
        </div>,
        { transport },
      )

      await waitFor(() => {
        const titleEl = screen.getByTestId('titlebar-title')
        expect(titleEl.textContent).toContain(eng.db)

        const serverInfoEl = screen.getByTestId('toolbar-server-info')
        expect(serverInfoEl.textContent).toContain(eng.driverId.toUpperCase())
        expect(serverInfoEl.textContent).toContain(eng.version)

        const statusConnEl = screen.getByTestId('statusbar-connection-info')
        expect(statusConnEl.textContent).toContain(eng.db)

        // Khẳng định KHÔNG khớp bất kỳ chuỗi cứng cấm nào
        expect(serverInfoEl.textContent).not.toBe('MySQL 8.0.36 · utf8mb4')
        expect(document.body.textContent).not.toContain('Corvus DB Studio — sakila @ Local Dev')
      })
    })
  }
})
