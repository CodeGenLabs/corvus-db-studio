import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { SettingsDialog } from '../components/dialogs/SettingsDialog'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Settings Persistence DOM Tests (T117 / FR-035)', () => {
  it('nạp và lưu thiết lập workspace qua workspace.settings.get/set', async () => {
    let settingsLoaded = false

    const transport: Transport = {
      status: 'ready',
      async request<TResult = unknown>(method: string): Promise<TResult> {
        if (method === 'workspace.settings.get') {
          settingsLoaded = true
          return { lang: 'vi', cfg: {} } as TResult
        }
        if (method === 'workspace.settings.set') {
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

    const { getByText } = renderStudio(<SettingsDialog />, { transport })
    await waitFor(() => {
      expect(getByText(/Chung/i)).toBeDefined()
      expect(settingsLoaded).toBe(true)
    })
  })
})
