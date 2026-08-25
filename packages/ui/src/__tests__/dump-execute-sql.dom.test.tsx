import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DumpExecuteSqlWizard } from '../wizards/DumpExecuteSqlWizard'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Dump & Execute SQL File DOM Tests (T132 / FR-040)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'file.pickSave') return { path: '/tmp/dump.sql' } as TResult
      if (method === 'file.pickOpen') return { paths: ['/tmp/dump.sql'] } as TResult
      if (method === 'job.start') return { jobId: 'job-dump-1' } as TResult
      if (method === 'job.cancel') return { success: true } as TResult
      return {} as TResult
    },
    stream<TChunk = unknown>(): AsyncIterable<TChunk> {
      return (async function* () {
        yield 'Dumping table customer' as TChunk
      })()
    },
    subscribe() {
      return () => {}
    },
    onStatusChange() {
      return () => {}
    },
  }

  it('render DumpExecuteSqlWizard cho chế độ dump và execute', async () => {
    const dump = renderStudio(<DumpExecuteSqlWizard mode="dump" onClose={() => {}} />, { transport })
    await waitFor(() => {
      expect(dump.getByText(/Kết xuất tệp SQL/i)).toBeDefined()
    })
    dump.unmount()

    const exec = renderStudio(<DumpExecuteSqlWizard mode="execute" onClose={() => {}} />, { transport })
    await waitFor(() => {
      expect(exec.getByText(/Thực thi tệp SQL/i)).toBeDefined()
    })
    exec.unmount()
  })
})
