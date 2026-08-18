import { Modal } from './Modal'

export interface DdlStepResult {
  statement: string
  status: 'success' | 'failed' | 'skipped'
  errorMessage?: string
}

export interface DdlPartialFailureDialogProps {
  tableName: string
  steps: DdlStepResult[]
  onClose: () => void
  onRollback?: () => void
}

export function DdlPartialFailureDialog({
  tableName,
  steps,
  onClose,
  onRollback,
}: DdlPartialFailureDialogProps) {
  return (
    <Modal onClose={onClose} surface={{ width: 620, height: 440, display: 'flex', flexDirection: 'column' }}>
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
        <span>⚠️ Lỗi thực thi DDL từng phần (DDL Partial Failure)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5 }}>
          Quá trình thay đổi cấu trúc bảng <strong style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{tableName}</strong> gặp lỗi ở một trong các bước DDL liên hoàn. Vui lòng kiểm tra chi tiết trạng thái từng câu lệnh:
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
          {steps.map((step, idx) => {
            const statusIcon = step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : '⏸️'
            const statusColor = step.status === 'success' ? '#10b981' : step.status === 'failed' ? '#ef4444' : 'var(--text3)'

            return (
              <div
                key={idx}
                style={{
                  padding: '8px 10px',
                  borderBottom: idx === steps.length - 1 ? 'none' : '1px solid var(--grid-line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  background: step.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                    Bước {idx + 1}: <span style={{ color: statusColor }}>{statusIcon} {step.status.toUpperCase()}</span>
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.4,
                  }}
                >
                  {step.statement}
                </pre>
                {step.errorMessage && (
                  <div style={{ color: '#ef4444', fontSize: 10.5, fontFamily: 'var(--mono)', marginTop: 2 }}>
                    Lỗi: {step.errorMessage}
                  </div>
                )}
              </div>
            )
          })}
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
          Đóng
        </button>
        {onRollback && (
          <button
            onClick={onRollback}
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
            Khôi phục trạng thái cũ (Rollback)
          </button>
        )}
      </div>
    </Modal>
  )
}
