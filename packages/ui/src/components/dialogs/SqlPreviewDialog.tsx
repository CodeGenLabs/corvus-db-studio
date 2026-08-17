import { Modal } from './Modal'
import type { DdlWarning } from '@corvus/contract'

export interface SqlPreviewDialogProps {
  sql: string
  previewToken?: string
  warnings?: DdlWarning[]
  onClose: () => void
  onApply: (token?: string) => void
  title?: string
}

export function SqlPreviewDialog({
  sql,
  previewToken,
  warnings = [],
  onClose,
  onApply,
  title = 'Xem trước câu lệnh SQL (Preview SQL)',
}: SqlPreviewDialogProps) {
  const hasDangerousWarnings = warnings.some((w) => w.level === 'danger' || w.level === 'warning')

  return (
    <Modal onClose={onClose} surface={{ width: 680, height: 440, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        <span>⚡ {title}</span>
        {previewToken && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text3)' }}>
            Token: {previewToken.slice(0, 12)}…
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {warnings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {warnings.map((w, idx) => {
              const bg = w.level === 'danger' ? 'rgba(239, 68, 68, 0.15)' : w.level === 'warning' ? 'rgba(234, 179, 8, 0.15)' : 'var(--accent-soft)'
              const color = w.level === 'danger' ? '#ef4444' : w.level === 'warning' ? 'var(--amber)' : 'var(--accent)'
              return (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 5,
                    background: bg,
                    color,
                    fontSize: 11.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>⚠️</span>
                  <span>{w.message}</span>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 120, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--pane)', overflow: 'auto' }}>
          <pre
            style={{
              margin: 0,
              padding: 12,
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              color: 'var(--text)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {sql}
          </pre>
        </div>
      </div>

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
          {hasDangerousWarnings
            ? 'Cẩn trọng: Thao tác có thể gây mất dữ liệu hoặc khoá bảng.'
            : 'Kiểm tra kỹ câu lệnh trước khi áp dụng vào cơ sở dữ liệu.'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              borderRadius: 4,
              color: 'var(--text)',
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            Huỷ
          </button>
          <button
            onClick={() => onApply(previewToken)}
            style={{
              padding: '6px 16px',
              border: 'none',
              background: hasDangerousWarnings ? '#ef4444' : 'var(--accent)',
              color: '#ffffff',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Áp dụng thay đổi (Apply)
          </button>
        </div>
      </div>
    </Modal>
  )
}
