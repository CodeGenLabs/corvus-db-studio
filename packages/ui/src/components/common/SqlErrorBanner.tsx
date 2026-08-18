export interface SqlErrorBannerProps {
  message: string
  line?: number
  column?: number
  onNavigateToError?: (line: number, column: number) => void
  onClose?: () => void
}

export function SqlErrorBanner({
  message,
  line,
  column,
  onNavigateToError,
  onClose,
}: SqlErrorBannerProps) {
  return (
    <div
      style={{
        padding: '6px 10px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderTop: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#ef4444',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--mono)',
      }}
    >
      <span style={{ fontWeight: 600 }}>❌ Lỗi SQL:</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {message}
      </span>

      {line !== undefined && (
        <button
          onClick={() => onNavigateToError?.(line, column ?? 1)}
          style={{
            padding: '2px 6px',
            border: '1px solid #ef4444',
            background: 'transparent',
            borderRadius: 3,
            color: '#ef4444',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          Nhảy đến Dòng {line}, Cột {column ?? 1}
        </button>
      )}

      {onClose && (
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
