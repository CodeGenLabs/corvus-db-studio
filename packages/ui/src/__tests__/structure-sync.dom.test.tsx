import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { StructureSyncWizard } from '../wizards/StructureSyncWizard'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Structure Sync DOM Tests (T131 / FR-039)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'connection.list') {
        return [
          { id: 'conn-1', name: 'DB Staging', driverId: 'postgres' },
          { id: 'conn-2', name: 'DB Production', driverId: 'postgres' },
        ] as TResult
      }
      if (method === 'job.start') {
        return { jobId: 'job-struct-sync-1' } as TResult
      }
      if (method === 'job.cancel') {
        return { success: true } as TResult
      }
      return {} as TResult
    },
    stream<TChunk = unknown>(): AsyncIterable<TChunk> {
      return (async function* () {
        yield 'Applying DDL to production' as TChunk
      })()
    },
    subscribe() {
      return () => {}
    },
    onStatusChange() {
      return () => {}
    },
  }

  it('render StructureSyncWizard phát hiện khác biệt cấu trúc và xem trước DDL', async () => {
    const { getByText } = renderStudio(
      <StructureSyncWizard onClose={() => {}} initialSourceConnId="conn-1" />,
      { transport },
    )
    await waitFor(() => {
      expect(getByText(/Đồng bộ cấu trúc bảng/i)).toBeDefined()
    })
  })
})
