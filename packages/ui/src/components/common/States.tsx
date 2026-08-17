import type { ReactNode } from 'react'

export interface StateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: ReactNode
}

export function EmptyState({
  title = 'Không có dữ liệu',
  description = 'Chưa có bản ghi hoặc đối tượng nào để hiển thị.',
  action,
  icon = '📭',
}: StateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        height: '100%',
        color: 'var(--text2)',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text3)', maxWidth: 320, marginBottom: action ? 16 : 0 }}>
        {description}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '6px 14px',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function LoadingState({
  title = 'Đang tải dữ liệu…',
  description = 'Vui lòng chờ trong giây lát.',
}: StateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        height: '100%',
        color: 'var(--text2)',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '2px solid var(--border-strong)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 12,
        }}
      />
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{description}</div>
    </div>
  )
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  description = 'Không thể tải hoặc xử lý yêu cầu của bạn.',
  action,
}: StateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        height: '100%',
        color: 'var(--text2)',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text3)', maxWidth: 360, marginBottom: action ? 16 : 0 }}>
        {description}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--border-strong)',
            background: 'var(--pane2)',
            color: 'var(--text)',
            borderRadius: 4,
            fontSize: 11.5,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function UnsupportedState({
  feature = 'Tính năng',
  engine = 'Engine hiện tại',
}: {
  feature?: string
  engine?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        height: '100%',
        color: 'var(--text3)',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
        Không hỗ trợ bởi {engine}
      </div>
      <div style={{ fontSize: 11, maxWidth: 320 }}>
        {feature} không khả dụng trên loại cơ sở dữ liệu này theo thông số `CapabilitySet`.
      </div>
    </div>
  )
}
