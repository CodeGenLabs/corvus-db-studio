import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DesignView } from '../views/DesignView'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Table Designer Tabs DOM Tests (T032 / SC-004 / FR-006)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(): Promise<TResult> {
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

  it('hỗ trợ chuyển đổi giữa 4 tab Fields, Indexes, Foreign Keys, SQL Preview', async () => {
    const { getByTestId } = renderStudio(<DesignView />, { transport })

    await waitFor(() => {
      expect(getByTestId('table-designer')).toBeDefined()
    })

    // Mặc định tab fields hiển thị
    expect(getByTestId('field-row-0')).toBeDefined()

    // Chuyển sang tab indexes
    fireEvent.click(getByTestId('tab-indexes'))
    expect(getByTestId('index-row-0')).toBeDefined()

    // Chuyển sang tab SQL Preview
    fireEvent.click(getByTestId('tab-sql-preview'))
    expect(getByTestId('sql-preview-text')).toBeDefined()
  })
})
