import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { SqlView } from '../views/SqlView'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Query Pinning & View Split Layout DOM Tests (T041 / SC-005 / SC-006 / FR-008 / FR-009)', () => {
  it('hỗ trợ ghim tab kết quả truy vấn và chuyển đổi bố cục Split', async () => {
    const transport: Transport = {
      status: 'ready',
      async request<TResult = unknown>(): Promise<TResult> {
        return {} as TResult
      },
      stream<TChunk = unknown>(): AsyncIterable<TChunk> {
        return (async function* () {
          yield {
            columns: [{ name: 'val', type: 'INT', align: 'r' }],
            rows: [[100]],
            stats: { rowCount: 1 },
          } as TChunk
        })()
      },
      subscribe() {
        return () => {}
      },
      onStatusChange() {
        return () => {}
      },
    }

    const { getByTestId } = renderStudio(<SqlView />, { transport })

    await waitFor(() => {
      expect(getByTestId('sql-view')).toBeDefined()
    })

    // Chạy câu lệnh lần 1
    fireEvent.click(getByTestId('btn-run-query'))

    await waitFor(() => {
      expect(getByTestId('tab-result-0')).toBeDefined()
    })

    // Ghim tab result 0
    fireEvent.click(getByTestId('btn-pin-result-0'))

    // Chạy câu lệnh lần 2 -> Giữ Result 1 và mở thêm Result 2
    fireEvent.click(getByTestId('btn-run-query'))

    await waitFor(() => {
      expect(getByTestId('tab-result-0')).toBeDefined()
      expect(getByTestId('tab-result-1')).toBeDefined()
    })

    // Chuyển layout sang Right Split
    fireEvent.click(getByTestId('btn-layout-right'))
    expect(getByTestId('sql-split-container').style.flexDirection).toBe('row')

    // Chuyển layout về Bottom Split
    fireEvent.click(getByTestId('btn-layout-bottom'))
    expect(getByTestId('sql-split-container').style.flexDirection).toBe('column')
  })
})
