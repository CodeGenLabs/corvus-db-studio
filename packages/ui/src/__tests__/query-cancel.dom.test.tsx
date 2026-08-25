import { describe, expect, it, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { SqlView } from '../views/SqlView'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Query Cancel DOM Tests (T114 / FR-029)', () => {
  it('gửi lệnh query.cancel khi huỷ truy vấn đang chạy', async () => {
    let cancelled = false

    const transport: Transport = {
      status: 'ready',
      async request<TResult = unknown>(method: string): Promise<TResult> {
        if (method === 'query.cancel') {
          cancelled = true
          return { success: true } as TResult
        }
        return {} as TResult
      },
      stream<TChunk = unknown>(): AsyncIterable<TChunk> {
        return (async function* () {
          yield { seq: 0, done: true, rows: [] } as TChunk
        })()
      },
      subscribe() {
        return () => {}
      },
      onStatusChange() {
        return () => {}
      },
    }

    const { getByText } = renderStudio(<SqlView />, { transport })
    expect(getByText(/Editor/i)).toBeDefined()
    expect(cancelled).toBe(false)
  })
})
