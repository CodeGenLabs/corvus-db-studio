import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { FindInDatabaseDialog } from '../components/dialogs/FindInDatabaseDialog'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Find in Database DOM Tests (T049 / SC-008 / FR-011)', () => {
  it('hỗ trợ tìm kiếm chuỗi văn bản trên các bảng trong database', async () => {
    const transport: Transport = {
      status: 'ready',
      async request<TResult = unknown>(method: string): Promise<TResult> {
        if (method === 'introspect.objects') {
          return [{ name: 'customer', kind: 'table' }] as TResult
        }
        if (method === 'introspect.tableMeta') {
          return {
            columns: [
              { name: 'first_name', dataType: 'varchar' },
              { name: 'email', dataType: 'varchar' },
            ],
          } as TResult
        }
        return {} as TResult
      },
      stream<TChunk = unknown>(): AsyncIterable<TChunk> {
        return (async function* () {
          yield {
            columns: [{ name: 'first_name', type: 'varchar' }],
            rows: [['MARY']],
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

    const { getByTestId } = renderStudio(<FindInDatabaseDialog />, { transport })

    await waitFor(() => {
      expect(getByTestId('find-in-db-dialog')).toBeDefined()
    })

    // Nhập từ khoá
    fireEvent.change(getByTestId('input-find-keyword'), { target: { value: 'MARY' } })

    // Bấm tìm kiếm
    fireEvent.click(getByTestId('btn-start-find'))

    await waitFor(() => {
      expect(getByTestId('find-result-row-0')).toBeDefined()
    })
  })
})
