import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DesignView } from '../views/DesignView'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Table Designer Preview Token DOM Tests (T033 / SC-004 / SR-002 / Rule 5)', () => {
  it('buộc mọi thao tác lưu cấu trúc bảng phải qua Preview Token Modal trước khi gọi apply', async () => {
    let appliedToken = ''

    const transport: Transport = {
      status: 'ready',
      async request<TResult = unknown>(method: string, params?: unknown): Promise<TResult> {
        if (method === 'ddl.previewTable') {
          return {
            sql: 'ALTER TABLE users ADD COLUMN age INT;',
            previewToken: 'tok-ddl-12345',
          } as TResult
        }
        if (method === 'ddl.applyTable') {
          appliedToken = (params as { previewToken: string }).previewToken
          return { ok: true } as TResult
        }
        return {} as TResult
      },
      stream<TChunk = unknown>(): AsyncIterable<TChunk> {
        return (async function* () {})()
      },
      subscribe() {
        return () => {}
      },
      onStatusChange() {
        return () => {}
      },
    }

    const { getByTestId } = renderStudio(<DesignView />, { transport })

    await waitFor(() => {
      expect(getByTestId('btn-preview-ddl')).toBeDefined()
    })

    // Bấm mở modal Preview
    fireEvent.click(getByTestId('btn-preview-ddl'))

    await waitFor(() => {
      expect(getByTestId('modal-preview-ddl')).toBeDefined()
    })

    // Bấm Áp dụng DDL
    fireEvent.click(getByTestId('btn-apply-ddl'))

    await waitFor(() => {
      expect(appliedToken).toBe('tok-ddl-12345')
    })
  })
})
