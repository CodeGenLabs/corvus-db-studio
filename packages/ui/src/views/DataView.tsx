import { useState } from 'react'
import { datasetFor, fieldsFor } from '../data/schema'
import { useStudio } from '../store/studio'
import { DataGrid } from '../components/grid'
import type { CellValue, ColumnDef } from '@corvus/contract'

export function DataView() {
  const { s } = useStudio()
  const ds = datasetFor(s.selTable)
  const colTypes = fieldsFor(s.selTable)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  const columns: ColumnDef[] = ds.cols.map((c, i) => ({
    name: c,
    type: colTypes[i]?.ddl ?? 'VARCHAR',
    align: ds.align[i] as 'r' | 't' | 'm',
  }))

  const rows: CellValue[][] = ds.rows.map((r) =>
    r.map((val) => {
      if (val === null || val === 'NULL') return { k: 'null' }
      if (typeof val === 'number') return { k: 'num', v: val }
      if (typeof val === 'boolean') return { k: 'bool', v: val }
      return { k: 'str', v: String(val) }
    }),
  )

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      totalRows={ds.rows.length}
      currentPage={page}
      pageSize={pageSize}
      tableName={s.selTable}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  )
}
