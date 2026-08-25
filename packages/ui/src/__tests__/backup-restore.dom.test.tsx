import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { JobsView } from '../views/JobsView'
import type { Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Backup & Restore DOM Tests (T118 / FR-032 / FR-036)', () => {
  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'job.list') {
        return [
          {
            id: 'job-1',
            kind: 'backup',
            name: 'Nightly Backup',
            status: 'completed',
            createdAt: '2026-08-20T02:00:00Z',
          },
        ] as TResult
      }
      if (method === 'schedule.list') {
        return [
          {
            id: 'sch-1',
            name: 'Backup Sakila Nightly',
            cronExpression: '0 2 * * *',
            jobKind: 'backup',
            jobConfig: {},
            enabled: true,
          },
        ] as TResult
      }
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

  it('render JobsView và tải danh sách tác vụ / sao lưu', async () => {
    const { getByTestId } = renderStudio(<JobsView />, { transport })
    await waitFor(() => {
      expect(getByTestId('jobs-view')).toBeDefined()
    })
  })
})
