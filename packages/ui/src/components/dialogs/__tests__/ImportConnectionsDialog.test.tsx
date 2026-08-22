import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { StudioProvider } from '../../../store/studio'
import { createMockTransport } from '@corvus/transport-mock'
import { ImportConnectionsDialog } from '../ImportConnectionsDialog'
import type { ConnectionProfile } from '@corvus/contract'

describe('ImportConnectionsDialog', () => {
  const transport = createMockTransport()
  const sampleConnections: ConnectionProfile[] = [
    {
      id: 'conn-pg',
      name: 'PostgreSQL Dev Stack',
      driverId: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'corvus_dev',
      user: 'corvus_dev',
    },
    {
      id: 'conn-mysql',
      name: 'MySQL Dev Stack',
      driverId: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      database: 'corvus_dev',
      user: 'corvus_dev',
    },
  ]

  it('renders dialog with connection list preview when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        StudioProvider,
        { transport },
        React.createElement(ImportConnectionsDialog, {
          open: true,
          connections: sampleConnections,
          onClose: vi.fn(),
        })
      )
    )
    expect(html).toContain('PostgreSQL Dev Stack')
    expect(html).toContain('MySQL Dev Stack')
    expect(html).toContain('127.0.0.1:5432')
    expect(html).toContain('127.0.0.1:3306')
    expect(html).toContain('Nhập danh sách kết nối')
  })

  it('does not render markup when open is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        StudioProvider,
        { transport },
        React.createElement(ImportConnectionsDialog, {
          open: false,
          connections: sampleConnections,
          onClose: vi.fn(),
        })
      )
    )
    expect(html).toBe('')
  })
})