import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { NavPane } from '../components/NavPane'
import type { ConnectionProfile, Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Connection Colorings DOM Tests (T048 / SC-007 / FR-010)', () => {
  const connections: ConnectionProfile[] = [
    {
      id: 'conn-prod',
      name: 'Production DB',
      driverId: 'postgres',
      color: 'red',
    },
    {
      id: 'conn-dev',
      name: 'Development DB',
      driverId: 'mysql',
      color: 'green',
    },
  ]

  const transport: Transport = {
    status: 'ready',
    async request<TResult = unknown>(method: string): Promise<TResult> {
      if (method === 'connection.list') {
        return connections as TResult
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

  it('hiển thị danh sách kết nối với thông tin màu nhận diện tương ứng', async () => {
    const { getByText } = renderStudio(<NavPane />, { transport })

    await waitFor(() => {
      expect(getByText('Production DB')).toBeDefined()
      expect(getByText('Development DB')).toBeDefined()
    })
  })
})
