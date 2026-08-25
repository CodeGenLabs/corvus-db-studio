import React from 'react'
import { useStudio } from '../../store/studio'

export interface DataGridBottomBarProps {
  totalRecords: number
  currentPage: number
  pageSize: number
  selectedRowIndex: number | null
  hasPendingChanges?: boolean
  isLoading?: boolean
  onAddRow?: () => void
  onDeleteRow?: () => void
  onApplyChanges?: () => void
  onDiscardChanges?: () => void
  onRefresh?: () => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function DataGridBottomBar({
  totalRecords,
  currentPage,
  pageSize,
  selectedRowIndex,
  hasPendingChanges = false,
  isLoading = false,
  onAddRow,
  onDeleteRow,
  onApplyChanges,
  onDiscardChanges,
  onRefresh,
  onPageChange,
  onPageSizeChange,
}: DataGridBottomBarProps) {
  const { t } = useStudio()

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalRecords / pageSize)) : 1
  const startRecord = pageSize > 0 ? (currentPage - 1) * pageSize + 1 : 1
  const endRecord = pageSize > 0 ? Math.min(currentPage * pageSize, totalRecords) : totalRecords
  const currentRecordDisplay = selectedRowIndex !== null
    ? (pageSize > 0 ? (currentPage - 1) * pageSize + selectedRowIndex + 1 : selectedRowIndex + 1)
    : (totalRecords > 0 ? startRecord : 0)

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 20,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 3,
    color: 'var(--text2)',
    cursor: 'pointer',
    fontSize: 11,
    padding: 0,
  }

  const disabledBtnStyle: React.CSSProperties = {
    ...btnStyle,
    opacity: 0.4,
    cursor: 'not-allowed',
  }

  return (
    <div
      data-testid="datagrid-bottom-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 26,
        padding: '0 8px',
        background: 'var(--pane2)',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text2)',
        userSelect: 'none',
        gap: 6,
      }}
    >
      {/* ── Row Action Buttons: + - ✓ ✗ ↻ ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          type="button"
          data-testid="btn-add-row"
          title={t.addRecord}
          onClick={onAddRow}
          style={btnStyle}
        >
          +
        </button>
        <button
          type="button"
          data-testid="btn-delete-row"
          title={t.deleteRecord}
          onClick={onDeleteRow}
          disabled={selectedRowIndex === null}
          style={selectedRowIndex !== null ? btnStyle : disabledBtnStyle}
        >
          −
        </button>
        <button
          type="button"
          data-testid="btn-apply-changes"
          title={t.applyChanges}
          onClick={onApplyChanges}
          disabled={!hasPendingChanges}
          style={hasPendingChanges ? { ...btnStyle, color: 'var(--green)' } : disabledBtnStyle}
        >
          ✓
        </button>
        <button
          type="button"
          data-testid="btn-discard-changes"
          title={t.discardChanges}
          onClick={onDiscardChanges}
          disabled={!hasPendingChanges}
          style={hasPendingChanges ? { ...btnStyle, color: 'var(--red)' } : disabledBtnStyle}
        >
          ✕
        </button>
        <button
          type="button"
          data-testid="btn-refresh"
          title="Làm mới"
          onClick={onRefresh}
          style={btnStyle}
        >
          ↻
        </button>
      </div>

      <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />

      {/* ── Page Navigation Buttons: ⏮ ◀ page/total ▶ ⏭ ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          type="button"
          data-testid="btn-first-page"
          title={t.firstPage}
          onClick={() => onPageChange?.(1)}
          disabled={currentPage <= 1 || isLoading}
          style={currentPage > 1 && !isLoading ? btnStyle : disabledBtnStyle}
        >
          ⏮
        </button>
        <button
          type="button"
          data-testid="btn-prev-page"
          title={t.previousPage}
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          style={currentPage > 1 && !isLoading ? btnStyle : disabledBtnStyle}
        >
          ◀
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '0 4px', gap: 2 }}>
          <input
            type="number"
            data-testid="input-current-page"
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onPageChange?.(val)
              }
            }}
            style={{
              width: 34,
              height: 18,
              padding: '0 2px',
              textAlign: 'center',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              background: 'var(--pane)',
              border: '1px solid var(--border)',
              borderRadius: 2,
              color: 'var(--text)',
            }}
          />
          <span style={{ color: 'var(--text3)' }}>/ {totalPages}</span>
        </div>

        <button
          type="button"
          data-testid="btn-next-page"
          title={t.nextPage}
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          style={currentPage < totalPages && !isLoading ? btnStyle : disabledBtnStyle}
        >
          ▶
        </button>
        <button
          type="button"
          data-testid="btn-last-page"
          title={t.lastPage}
          onClick={() => onPageChange?.(totalPages)}
          disabled={currentPage >= totalPages || isLoading}
          style={currentPage < totalPages && !isLoading ? btnStyle : disabledBtnStyle}
        >
          ⏭
        </button>
      </div>

      <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />

      {/* ── Limit Selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{t.limitRecords}:</span>
        <select
          data-testid="select-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          style={{
            height: 18,
            padding: '0 4px',
            fontSize: 10.5,
            background: 'var(--pane)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            color: 'var(--text)',
          }}
        >
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
          <option value={0}>All</option>
        </select>
      </div>

      {/* ── Record Status String: Record a of b in page c ── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {isLoading && <span style={{ color: 'var(--accent)', fontSize: 10.5 }}>{t.loading}</span>}
        <span data-testid="record-status-text" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text2)' }}>
          {totalRecords === 0
            ? '0 records'
            : pageSize > 0
              ? `Record ${currentRecordDisplay} (${startRecord}-${endRecord}) of ${totalRecords} in page ${currentPage}`
              : `Record ${currentRecordDisplay} of ${totalRecords}`}
        </span>
      </div>
    </div>
  )
}
