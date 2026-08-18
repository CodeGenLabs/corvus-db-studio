import { Modal } from '../dialogs/Modal'

export interface NoWhereWarningModalProps {
  operation: 'DELETE' | 'UPDATE'
  sql: string
  onClose: () => void
  onConfirmExecute: () => void
}

export function NoWhereWarningModal({
  operation,
  sql,
  onClose,
  onConfirmExecute,
}: NoWhereWarningModalProps) {
  return (
    <Modal onClose={onClose} surface={{ width: 520, height: 320, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>🚨 Cảnh báo câu lệnh {operation} không có điều kiện WHERE!</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
          Câu lệnh <strong style={{ color: '#ef4444' }}>{operation}</strong> của bạn không chứa mệnh đề <code>WHERE</code>. Hành động này sẽ thay đổi hoặc xoá <strong style={{ color: '#ef4444' }}>toàn bộ các dòng</strong> trong bảng!
        </p>

        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--pane2)', padding: 8, overflow: 'auto' }}>
          <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
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
          justifyContent: 'flex-end',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
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
          Huỷ thực thi
        </button>
        <button
          onClick={onConfirmExecute}
          style={{
            padding: '6px 16px',
            border: 'none',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Vẫn thực thi toàn bộ bảng
        </button>
      </div>
    </Modal>
  )
}
