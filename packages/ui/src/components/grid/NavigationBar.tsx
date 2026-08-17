export interface NavigationBarProps {
  currentPage: number
  totalRows?: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function NavigationBar({
  currentPage,
  totalRows,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: NavigationBarProps) {
  const totalPages = totalRows ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1

  return (
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 8px',
        borderTop: '1px solid var(--border)',
        background: 'var(--pane2)',
        fontSize: 11,
        color: 'var(--text2)',
      }}
    >
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 10,
          }}
          title="First Page"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 10,
          }}
          title="Previous Page"
        >
          ‹
        </button>
        <span style={{ padding: '0 6px', display: 'flex', alignItems: 'center' }}>
          Trang {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: 10,
          }}
          title="Next Page"
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          style={{
            height: 20,
            padding: '0 6px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 3,
            color: 'var(--text)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: 10,
          }}
          title="Last Page"
        >
          »
        </button>
      </div>

      {totalRows !== undefined && (
        <span style={{ marginLeft: 8, color: 'var(--text3)' }}>
          Tổng: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{totalRows.toLocaleString()}</span> dòng
        </span>
      )}

      {onPageSizeChange && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Số dòng / trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            style={{
              height: 20,
              padding: '0 4px',
              border: '1px solid var(--border-strong)',
              borderRadius: 3,
              background: 'var(--pane)',
              color: 'var(--text)',
              fontSize: 10.5,
            }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1,000</option>
          </select>
        </div>
      )}
    </div>
  )
}
