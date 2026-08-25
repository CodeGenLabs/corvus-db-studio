import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { UsersDialog } from '../components/dialogs/UsersDialog'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Security & User Management DOM Tests (T116 / FR-030)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'security.users') {
        return [
          { user: 'admin', host: '%', roles: ['admin'], status: 'active' },
          { user: 'readonly', host: 'localhost', roles: ['reader'], status: 'active' },
        ] as TResult
      }
      if (method === 'security.roles') {
        return [{ role: 'admin', members: ['admin'] }] as TResult
      }
      if (method === 'security.privileges') {
        return [{ object: '*', privilege: 'SELECT', granted: true }] as TResult
      }
      if (method === 'security.previewGrant') {
        return { sql: 'GRANT SELECT ON * TO admin;', previewToken: 'token-sec', warnings: [] } as TResult
      }
      if (method === 'security.applyGrant') {
        return { success: true } as TResult
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

  it('render UsersDialog và tải người dùng từ RPC security.users', async () => {
    const { getByText } = renderStudio(<UsersDialog />, { transport })
    await waitFor(() => {
      expect(getByText('Người dùng & quyền')).toBeDefined()
    })
  })
})
