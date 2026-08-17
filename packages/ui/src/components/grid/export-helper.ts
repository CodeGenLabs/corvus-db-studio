import type { CellValue, ColumnDef } from '@corvus/contract'
import { renderCellValue } from './cell-formatter'
import type { ExportFormat, GridSelection } from './types'

export function exportGridData(
  columns: ColumnDef[],
  rows: CellValue[][],
  selection?: GridSelection | null,
  format: ExportFormat = 'tsv',
  tableName = 'exported_table',
): string {
  const targetCols = selection
    ? columns.slice(selection.startCol, selection.endCol + 1)
    : columns

  const targetRows = selection
    ? rows
        .slice(selection.startRow, selection.endRow + 1)
        .map((r) => r.slice(selection.startCol, selection.endCol + 1))
    : rows

  switch (format) {
    case 'tsv': {
      const header = targetCols.map((c) => c.name).join('\t')
      const body = targetRows.map((r) => r.map((c) => renderCellValue(c)).join('\t')).join('\n')
      return `${header}\n${body}`
    }

    case 'json': {
      const data = targetRows.map((r) => {
        const obj: Record<string, unknown> = {}
        targetCols.forEach((col, idx) => {
          const val = r[idx]
          obj[col.name] = val && typeof val === 'object' && 'v' in val ? val.v : null
        })
        return obj
      })
      return JSON.stringify(data, null, 2)
    }

    case 'markdown': {
      const header = `| ${targetCols.map((c) => c.name).join(' | ')} |`
      const divider = `| ${targetCols.map(() => '---').join(' | ')} |`
      const body = targetRows
        .map((r) => `| ${r.map((c) => renderCellValue(c).replace(/\|/g, '\\|')).join(' | ')} |`)
        .join('\n')
      return `${header}\n${divider}\n${body}`
    }

    case 'insert': {
      const colList = targetCols.map((c) => `"${c.name}"`).join(', ')
      const lines = targetRows.map((r) => {
        const vals = r.map((c) => {
          if (!c || (typeof c === 'object' && c.k === 'null')) return 'NULL'
          if (typeof c === 'object' && 'v' in c) {
            if (typeof c.v === 'number' || typeof c.v === 'boolean') return String(c.v)
            return `'${String(c.v).replace(/'/g, "''")}'`
          }
          return `'${String(c).replace(/'/g, "''")}'`
        }).join(', ')
        return `INSERT INTO "${tableName}" (${colList}) VALUES (${vals});`
      })
      return lines.join('\n')
    }
  }
}
