import { describe, expect, it, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { ImportWizard } from '../wizards/ImportWizard'
import { ExportWizard } from '../wizards/ExportWizard'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Import / Export Roundtrip DOM Tests (T115 / FR-033 / FR-034)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'file.pickOpen') return { paths: ['/path/to/data.csv'] } as TResult
      if (method === 'file.pickSave') return { path: '/path/to/data.csv' } as TResult
      if (method === 'file.stat') return { sizeBytes: 1024, modifiedAt: '2026-08-20', isFile: true, isDirectory: false } as TResult
      if (method === 'file.readChunk') return { data: 'aWQ=', bytesRead: 3, eof: true } as TResult
      if (method === 'file.writeChunk') return { bytesWritten: 3 } as TResult
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

  it('render ImportWizard và ExportWizard an toàn qua RPC file', () => {
    const imp = renderStudio(<ImportWizard onClose={() => {}} />, { transport })
    expect(imp.container).toBeDefined()
    imp.unmount()

    const exp = renderStudio(<ExportWizard onClose={() => {}} />, { transport })
    expect(exp.container).toBeDefined()
    exp.unmount()
  })
})
