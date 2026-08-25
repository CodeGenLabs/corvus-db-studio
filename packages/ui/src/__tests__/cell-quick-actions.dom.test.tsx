import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DataGrid } from '../components/grid'
import type { CellValue, ColumnDef, Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Cell Quick Actions DOM Tests (T015 / SC-002 / FR-003)', () => {
  const columns: ColumnDef[] = [
    { name: 'id', type: 'int4', nullable: false, align: 'r' },
    { name: 'name', type: 'varchar', nullable: true, align: 'm' },
  ]

  const rows: CellValue[][] = [
    [{ k: 'num', v: 1 }, { k: 'str', v: 'MARY' }],
  ]

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

  it('hỗ trợ gán NULL cho ô dữ liệu qua phím tắt Ctrl+Delete', async () => {
    let editedCell: { r: number; c: number; val: CellValue } | null = null

    const { getByText } = renderStudio(
      <DataGrid
        columns={columns}
        rows={rows}
        onCellEdit={(r, c, val) => {
          editedCell = { r, c, val }
        }}
      />,
      { transport },
    )

    await waitFor(() => {
      expect(getByText('MARY')).toBeDefined()
    })

    const cell = getByText('MARY')
    fireEvent.click(cell)
    fireEvent.keyDown(cell, { key: 'Delete', ctrlKey: true })

    expect(editedCell).toEqual({ r: 0, c: 1, val: { k: 'null' } })
  })
})
