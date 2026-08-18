export interface JobProgressPanelProps {
  jobId: string
  jobName: string
  status: 'running' | 'completed' | 'failed'
  progressPercent: number
  logs: string[]
  onCancel?: () => void
  onClose?: () => void
}

export function JobProgressPanel({
  jobId,
  jobName,
  status,
  progressPercent,
  logs,
  onCancel,
  onClose,
}: JobProgressPanelProps) {
  const statusColor = status === 'completed' ? '#10b981' : status === 'failed' ? '#ef4444' : 'var(--accent)'
  const statusLabel = status === 'completed' ? 'Hoàn thành' : status === 'failed' ? 'Thất bại' : 'Đang xử lý…'

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--pane)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 260,
      }}
    >
      <div
        style={{
          height: 32,
          padding: '0 10px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
        }}
      >
        <strong style={{ color: 'var(--text)' }}>⚙️ {jobName}</strong>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>({jobId})</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: statusColor, fontWeight: 600, fontSize: 10.5 }}>
            {statusLabel} ({progressPercent}%)
          </span>
          {status === 'running' && onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '2px 6px',
                border: '1px solid #ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 3,
                color: '#ef4444',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              Huỷ tác vụ
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{ border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 11 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 4, background: 'var(--pane2)', width: '100%' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, progressPercent))}%`,
            background: statusColor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Log tail stream view */}
      <div
        style={{
          flex: 1,
          padding: 8,
          overflow: 'auto',
          background: '#0d1117',
          color: '#c9d1d9',
          fontFamily: 'var(--mono)',
          fontSize: 10.5,
          lineHeight: 1.4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#8b949e' }}>Đang chờ nhật ký xử lý…</div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
