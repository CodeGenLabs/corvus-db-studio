import { useState } from 'react'
import type { CellValue, ColumnDef } from '@corvus/contract'
import { renderCellValue, isNullValue } from './cell-formatter'
import { exportGridData } from './export-helper'
import { NavigationBar } from './NavigationBar'
import type { ExportFormat, GridSelection } from './types'

export interface DataGridProps {
  columns: ColumnDef[]
  rows: CellValue[][]
  totalRows?: number
  pageSize?: number
  currentPage?: number
  tableName?: string
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onCellEdit?: (rowIdx: number, colIdx: number, val: CellValue) => void
}

export function DataGrid({
  columns,
  rows,
  totalRows,
  pageSize = 100,
  currentPage = 1,
  tableName = 'table',
  onPageChange,
  onPageSizeChange,
  onCellEdit,
}: DataGridProps) {
  const [selection, setSelection] = useState<GridSelection | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; val: string } | null>(null)

  const handleCellClick = (r: number, c: number) => {
    setSelection({ startRow: r, startCol: c, endRow: r, endCol: c })
  }

  const handleCellDoubleClick = (r: number, c: number) => {
    const raw = rows[r]?.[c]
    setEditingCell({ row: r, col: c, val: renderCellValue(raw) })
  }

  const handleCommitEdit = () => {
    if (!editingCell || !onCellEdit) return
    onCellEdit(editingCell.row, editingCell.col, { k: 'str', v: editingCell.val })
    setEditingCell(null)
  }

  const handleCopy = (format: ExportFormat) => {
    const text = exportGridData(columns, rows, selection, format, tableName)
    navigator.clipboard.writeText(text)
  }

  const gridTemplate = `40px ${columns.map(() => 'minmax(120px, 1fr)').join(' ')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          height: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--text3)' }}>Sao chép:</span>
        <button
          onClick={() => handleCopy('tsv')}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 10.5,
          }}
        >
          TSV / Excel
        </button>
        <button
          onClick={() => handleCopy('json')}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 10.5,
          }}
        >
          JSON
        </button>
        <button
          onClick={() => handleCopy('markdown')}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 10.5,
          }}
        >
          Markdown
        </button>
        <button
          onClick={() => handleCopy('insert')}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 10.5,
          }}
        >
          INSERT SQL
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: gridTemplate,
            background: 'var(--pane2)',
            borderBottom: '1px solid var(--border-strong)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text2)',
          }}
        >
          <div style={{ padding: '5px 6px', borderRight: '1px solid var(--grid-line)' }} />
          {columns.map((c, i) => (
            <div
              key={c.name + i}
              style={{
                padding: '4px 8px 3px',
                borderRight: i === columns.length - 1 ? 'none' : '1px solid var(--grid-line)',
                textAlign: c.align === 'r' ? 'right' : 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{c.name}</span>
              <span
                style={{
                  display: 'block',
                  marginTop: 1,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  fontWeight: 400,
                  color: 'var(--text3)',
                }}
              >
                {c.type.toLowerCase()}
              </span>
            </div>
          ))}
        </div>

        {rows.map((r, rowIdx) => (
          <div
            key={rowIdx}
            className="hv-row"
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              background: rowIdx % 2 ? 'var(--row-alt)' : 'transparent',
              height: 24,
              fontSize: 11.5,
            }}
          >
            <div
              style={{
                padding: '0 6px',
                textAlign: 'right',
                color: 'var(--text3)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                borderRight: '1px solid var(--grid-line)',
              }}
            >
              {rowIdx + 1 + (currentPage - 1) * pageSize}
            </div>

            {r.map((val, colIdx) => {
              const isSelected =
                selection &&
                rowIdx >= selection.startRow &&
                rowIdx <= selection.endRow &&
                colIdx >= selection.startCol &&
                colIdx <= selection.endCol

              const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx
              const isNull = isNullValue(val)

              return (
                <div
                  key={colIdx}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  onDoubleClick={() => handleCellDoubleClick(rowIdx, colIdx)}
                  style={{
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: columns[colIdx]?.align === 'r' ? 'flex-end' : 'flex-start',
                    borderRight: colIdx === r.length - 1 ? 'none' : '1px solid var(--grid-line)',
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: isNull ? 'var(--text3)' : 'var(--text)',
                    fontFamily: columns[colIdx]?.align === 'r' ? 'var(--mono)' : 'inherit',
                    fontStyle: isNull ? 'italic' : 'normal',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    userSelect: 'none',
                  }}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingCell.val}
                      onChange={(e) => setEditingCell({ ...editingCell, val: e.target.value })}
                      onBlur={handleCommitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitEdit()
                        if (e.key === 'Escape') setEditingCell(null)
                      }}
                      style={{
                        width: '100%',
                        height: 20,
                        border: '1px solid var(--accent)',
                        background: 'var(--pane)',
                        color: 'var(--text)',
                        padding: '0 4px',
                        fontSize: 11.5,
                      }}
                    />
                  ) : (
                    renderCellValue(val)
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {onPageChange && (
        <NavigationBar
          currentPage={currentPage}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  )
}
