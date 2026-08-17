import type { CellValue, ColumnDef } from '@corvus/contract'

export interface GridSelection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export type ExportFormat = 'tsv' | 'json' | 'markdown' | 'insert'

export interface GridProps {
  columns: ColumnDef[]
  rows: CellValue[][]
  rowCount?: number
  pageSize?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  onCellEdit?: (rowIdx: number, colIdx: number, val: CellValue) => void
}
