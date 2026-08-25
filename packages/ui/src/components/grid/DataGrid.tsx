import { useState } from 'react'
import type { CellValue, ColumnDef, DialogId } from '@corvus/contract'
import { useStudio, useClient } from '../../store/studio'
import { useActiveContext } from '../../context/useActiveContext'
import { useContextMenu } from '../useContextMenu'
import { ContextMenu } from '../ContextMenu'
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
  sortColumn?: string
  sortDirection?: 'asc' | 'desc' | null
  onSortChange?: (colName: string, dir: 'asc' | 'desc' | null) => void
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
  sortColumn,
  sortDirection,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onCellEdit,
}: DataGridProps) {
  const { set, openTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-data-grid')
  const [selection, setSelection] = useState<GridSelection | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; val: string } | null>(null)

  const handleHeaderClick = (colName: string) => {
    if (!onSortChange) return
    if (sortColumn !== colName) {
      onSortChange(colName, 'asc')
    } else if (sortDirection === 'asc') {
      onSortChange(colName, 'desc')
    } else {
      onSortChange(colName, null)
    }
  }

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
    <div
      data-testid="data-grid"
      onContextMenu={(e) => openContextMenu(e, 'empty')}
      onKeyDown={(e) => handleKeyDown(e, 'empty')}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
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
          {columns.map((c, i) => {
            const isSorted = sortColumn === c.name
            return (
              <div
                key={c.name + i}
                onClick={() => handleHeaderClick(c.name)}
                onContextMenu={(e) => {
                  e.stopPropagation()
                  openContextMenu(e, 'column-header')
                }}
                onKeyDown={(e) => handleKeyDown(e, 'column-header')}
                tabIndex={0}
                style={{
                  padding: '4px 8px 3px',
                  borderRight: i === columns.length - 1 ? 'none' : '1px solid var(--grid-line)',
                  textAlign: c.align === 'r' ? 'right' : 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: onSortChange ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: c.align === 'r' ? 'flex-end' : 'flex-start',
                  gap: 4,
                }}
              >
                <span>{c.name}</span>
                {isSorted && (
                  <span style={{ fontSize: 9, color: 'var(--accent)' }}>
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
                <span style={{ fontSize: 9.5, color: 'var(--text3)', fontWeight: 400 }}>{c.type}</span>
              </div>
            )
          })}
        </div>

        {rows.map((row, rIdx) => (
          <div
            key={rIdx}
            className="hv-row"
            style={{
              display: 'grid',
              gridTemplateColumns: gridTemplate,
              borderBottom: '1px solid var(--grid-line)',
              fontSize: 11.5,
              height: 24,
              alignItems: 'center',
            }}
          >
            <div
              onContextMenu={(e) => {
                e.stopPropagation()
                openContextMenu(e, 'row-header')
              }}
              onKeyDown={(e) => handleKeyDown(e, 'row-header')}
              tabIndex={0}
              style={{
                padding: '0 6px',
                textAlign: 'right',
                color: 'var(--text3)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                borderRight: '1px solid var(--grid-line)',
                cursor: 'pointer',
              }}
            >
              {(currentPage - 1) * pageSize + rIdx + 1}
            </div>

            {columns.map((col, cIdx) => {
              const cell = row[cIdx]
              const isNull = isNullValue(cell)
              const isSelected =
                selection &&
                rIdx >= Math.min(selection.startRow, selection.endRow) &&
                rIdx <= Math.max(selection.startRow, selection.endRow) &&
                cIdx >= Math.min(selection.startCol, selection.endCol) &&
                cIdx <= Math.max(selection.startCol, selection.endCol)

              const isEditing = editingCell?.row === rIdx && editingCell?.col === cIdx

              if (isEditing) {
                return (
                  <div key={col.name + cIdx} style={{ padding: '0 2px' }}>
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
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        padding: '0 4px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )
              }

              return (
                <div
                  key={col.name + cIdx}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  onDoubleClick={() => handleCellDoubleClick(rIdx, cIdx)}
                  onContextMenu={(e) => {
                    e.stopPropagation()
                    handleCellClick(rIdx, cIdx)
                    openContextMenu(e, 'cell')
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'cell')}
                  tabIndex={0}
                  style={{
                    padding: '0 8px',
                    textAlign: col.align === 'r' ? 'right' : 'left',
                    fontFamily: 'var(--mono)',
                    color: isNull ? 'var(--text3)' : 'var(--text)',
                    fontStyle: isNull ? 'italic' : 'normal',
                    background: isSelected ? 'var(--sel)' : 'transparent',
                    borderRight: cIdx === columns.length - 1 ? 'none' : '1px solid var(--grid-line)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'cell',
                  }}
                >
                  {renderCellValue(cell)}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <NavigationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalRows={totalRows}
        onPageChange={onPageChange || (() => {})}
        onPageSizeChange={onPageSizeChange || (() => {})}
      />

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-data-grid"
          targetKind={menuState.targetKind}
          activeContext={ctx}
          commandContext={{
            active: ctx,
            client,
            openTab,
            openDialog: (d) => set({ dialog: d as DialogId }),
          }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
