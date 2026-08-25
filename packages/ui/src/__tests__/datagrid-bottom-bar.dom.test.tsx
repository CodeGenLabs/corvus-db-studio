import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { DataGrid } from '../components/grid'
import type { CellValue, ColumnDef, Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('DataGrid Bottom Bar DOM Tests (T014 / SC-001 / FR-001 / FR-002)', () => {
  const columns: ColumnDef[] = [
    { name: 'customer_id', type: 'int4', nullable: false, align: 'r' },
    { name: 'first_name', type: 'varchar', nullable: false, align: 'm' },
    { name: 'email', type: 'varchar', nullable: true, align: 'm' },
  ]

  const rows: CellValue[][] = [
    [{ k: 'num', v: 1 }, { k: 'str', v: 'MARY' }, { k: 'str', v: 'mary@example.com' }],
    [{ k: 'num', v: 2 }, { k: 'str', v: 'PATRICIA' }, { k: 'str', v: 'patricia@example.com' }],
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

  it('render DataGridBottomBar đầy đủ các nút và nhãn phân trang', async () => {
    let pageChanged = 0
    let pageSizeChanged = 0
    let addedRow = false

    const { getByTestId } = renderStudio(
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={599}
        currentPage={1}
        pageSize={100}
        onPageChange={(p) => {
          pageChanged = p
        }}
        onPageSizeChange={(s) => {
          pageSizeChanged = s
        }}
        onAddRow={() => {
          addedRow = true
        }}
      />,
      { transport },
    )

    await waitFor(() => {
      expect(getByTestId('datagrid-bottom-bar')).toBeDefined()
      expect(getByTestId('record-status-text').textContent).toContain('599')
    })

    // Test bấm nút Next Page
    fireEvent.click(getByTestId('btn-next-page'))
    expect(pageChanged).toBe(2)

    // Test chọn page size
    fireEvent.change(getByTestId('select-page-size'), { target: { value: '500' } })
    expect(pageSizeChanged).toBe(500)

    // Test bấm nút thêm dòng
    fireEvent.click(getByTestId('btn-add-row'))
    expect(addedRow).toBe(true)
  })
})
