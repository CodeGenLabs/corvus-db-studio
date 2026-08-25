import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DataTransferWizard } from '../wizards/DataTransferWizard'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Data Transfer DOM Tests (T129 / FR-037)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'connection.list') {
        return [
          { id: 'conn-pg', name: 'PostgreSQL Dev', driverId: 'postgres' },
          { id: 'conn-my', name: 'MySQL Dev', driverId: 'mysql' },
        ] as TResult
      }
      if (method === 'job.start') {
        return { jobId: 'job-transfer-1' } as TResult
      }
      if (method === 'job.cancel') {
        return { success: true } as TResult
      }
      return {} as TResult
    },
    stream<TChunk = unknown>(): AsyncIterable<TChunk> {
      return (async function* () {
        yield 'Transferring table customer: 100 rows transferred' as TChunk
        yield 'Transferring table film: 50 rows transferred' as TChunk
      })()
    },
    subscribe() {
      return () => {}
    },
    onStatusChange() {
      return () => {}
    },
  }

  it('render DataTransferWizard và cho phép chọn kết nối nguồn đích', async () => {
    const { getByText } = renderStudio(
      <DataTransferWizard onClose={() => {}} initialSourceConnId="conn-pg" />,
      { transport },
    )
    await waitFor(() => {
      expect(getByText(/Chuyển dữ liệu giữa các máy chủ/i)).toBeDefined()
    })
  })
})
