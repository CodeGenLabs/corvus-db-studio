import { describe, expect, it, afterEach } from 'vitest'
import { cleanup, waitFor, fireEvent } from '@testing-library/react'
import { renderStudio } from './helpers/renderStudio'
import { FilterPanel } from '../components/FilterPanel'
import type { ColumnDef, Transport } from '@corvus/contract'

afterEach(() => {
  cleanup()
})

describe('Filter & Sort Panel DOM Tests (T023 / SC-003 / FR-004 / FR-005)', () => {
  const columns: ColumnDef[] = [
    { name: 'id', type: 'int4', nullable: false, align: 'r' },
    { name: 'status', type: 'varchar', nullable: false, align: 'm' },
    { name: 'age', type: 'int4', nullable: true, align: 'r' },
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

  it('hỗ trợ thêm điều kiện lọc và áp dụng câu lệnh WHERE', async () => {
    let appliedClause = ''

    const { getByTestId } = renderStudio(
      <FilterPanel
        columns={columns}
        onApplyFilter={(clause) => {
          appliedClause = clause
        }}
      />,
      { transport },
    )

    await waitFor(() => {
      expect(getByTestId('filter-panel')).toBeDefined()
    })

    // Chọn cột status
    fireEvent.change(getByTestId('select-rule-field-0'), { target: { value: 'status' } })
    // Nhập giá trị active
    fireEvent.change(getByTestId('input-rule-value-0'), { target: { value: 'active' } })

    // Bấm áp dụng
    fireEvent.click(getByTestId('btn-apply-filter'))
    expect(appliedClause).toBe('"status" = \'active\'')
  })

  it('hỗ trợ thêm điều kiện sắp xếp đa cột', async () => {
    const { getByTestId } = renderStudio(
      <FilterPanel columns={columns} />,
      { transport },
    )

    await waitFor(() => {
      expect(getByTestId('filter-panel')).toBeDefined()
    })

    // Bấm thêm sort
    fireEvent.click(getByTestId('btn-add-sort'))
    expect(getByTestId('sort-rule-0')).toBeDefined()

    // Đổi hướng sắp xếp
    fireEvent.click(getByTestId('btn-toggle-sort-dir-0'))
    expect(getByTestId('btn-toggle-sort-dir-0').textContent).toBe('DESC')
  })
})
