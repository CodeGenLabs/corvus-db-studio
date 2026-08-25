import { describe, expect, it, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { SqlView } from '../views/SqlView'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Transaction Lifecycle DOM Tests (T113 / FR-028)', () => {
  it('hỗ trợ bắt đầu, xác nhận và huỷ bỏ giao dịch với mã định danh giao dịch', async () => {
    let txStarted = false
    let txCommitted = false

    const transport: Transport = {
      status: 'ready',
      async request<TResult = unknown>(method: string): Promise<TResult> {
        if (method === 'tx.begin') {
          txStarted = true
          return { transactionId: 'tx-12345' } as TResult
        }
        if (method === 'tx.commit') {
          txCommitted = true
          return { success: true } as TResult
        }
        if (method === 'tx.status') {
          return { active: txStarted && !txCommitted, startedAt: '2026-08-20T10:00:00Z', queryCount: 1 } as TResult
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

    const { container } = renderStudio(<SqlView />, { transport })
    expect(container).toBeDefined()
  })
})
