import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DataSyncWizard } from '../wizards/DataSyncWizard'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Data Sync DOM Tests (T130 / FR-038)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'connection.list') {
        return [
          { id: 'conn-pg-1', name: 'Postgres Source', driverId: 'postgres' },
          { id: 'conn-pg-2', name: 'Postgres Target', driverId: 'postgres' },
        ] as TResult
      }
      if (method === 'job.start') {
        return { jobId: 'job-sync-1' } as TResult
      }
      if (method === 'job.cancel') {
        return { success: true } as TResult
      }
      return {} as TResult
    },
    stream<TChunk = unknown>(): AsyncIterable<TChunk> {
      return (async function* () {
        yield 'Syncing customer row 101' as TChunk
      })()
    },
    subscribe() {
      return () => {}
    },
    onStatusChange() {
      return () => {}
    },
  }

  it('render DataSyncWizard hiển thị các bước đồng bộ và xem trước', async () => {
    const { getByText } = renderStudio(
      <DataSyncWizard onClose={() => {}} initialSourceConnId="conn-pg-1" />,
      { transport },
    )
    await waitFor(() => {
      expect(getByText(/Đồng bộ dữ liệu/i)).toBeDefined()
    })
  })
})
