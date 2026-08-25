import { describe, expect, it, afterEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderStudio } from './helpers/renderStudio'
import { NavPane } from '../components/NavPane'
import type { Transport } from '@corvus/contract'
import { useShellStore } from '../store/shell'

afterEach(() => {
  cleanup()
})

const ENGINES = ['postgres', 'mysql', 'mariadb', 'mssql', 'oracle', 'sqlite', 'mongodb', 'redis']

function createFailingTransport(driverId: string): Transport {
  return {
    status: 'ready',
    async request<TResult = unknown>(method: string, _params?: unknown): Promise<TResult> {
      if (method === 'connection.list') {
        return [
          {
            id: `conn-${driverId}`,
            name: `${driverId} Dev Server`,
            driverId,
            host: '127.0.0.1',
            port: 5432,
            database: 'corvus_dev',
          },
        ] as TResult
      }
      if (method === 'connection.open') {
        throw new Error(`ECONNREFUSED 127.0.0.1:5432`)
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

describe('T043 · Connection Error Display & Safe Redaction (FR-005, SR-002, Cấm 6)', () => {
  for (const engine of ENGINES) {
    it(`hiển thị thông điệp lỗi và nút thử lại khi mở ${engine} thất bại mà không lộ mật khẩu`, async () => {
      const connId = `conn-${engine}`
      const transport = createFailingTransport(engine)

      useShellStore.setState({
        open: { [connId]: true },
      })

      renderStudio(<NavPane />, { transport })

      // Chờ thông điệp lỗi xuất hiện
      await waitFor(() => {
        const errorEl = screen.getByTestId(`nav-error-${connId}`)
        expect(errorEl).toBeDefined()
        expect(errorEl.textContent).toContain('ECONNREFUSED')
      })

      // Nút Thử lại (Retry) phải có mặt
      const retryBtn = screen.getByTestId(`nav-retry-${connId}`)
      expect(retryBtn).toBeDefined()
      await userEvent.click(retryBtn)

      // Kiểm tra an toàn bảo mật (Cấm 6 / SR-002): Không được chứa từ khoá nhạy cảm
      const bodyText = document.body.textContent ?? ''
      expect(bodyText).not.toMatch(/password|corvus_dev_pw|secret|BEGIN PRIVATE/i)
      expect(bodyText).not.toMatch(/node_modules|at async|packages\/driver/i)
    })
  }
})
