import { useState } from 'react'
import { Modal } from './Modal'

export interface ParamPromptModalProps {
  params: string[]
  onClose: () => void
  onExecute: (paramValues: Record<string, any>) => void
}

export function ParamPromptModal({
  params,
  onClose,
  onExecute,
}: ParamPromptModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    params.forEach((p) => {
      initial[p] = ''
    })
    return initial
  })

  const handleChange = (paramName: string, val: string) => {
    setValues((prev) => ({ ...prev, [paramName]: val }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onExecute(values)
  }

  return (
    <Modal onClose={onClose} surface={{ width: 480, height: 340, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        <span>🎯 Nhập giá trị tham số truy vấn (Query Parameters)</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text2)' }}>
          Câu lệnh SQL chứa các tham số động. Vui lòng điền giá trị cho từng biến dưới đây trước khi thực thi:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {params.map((p) => (
            <div key={p} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, alignItems: 'center' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--accent)', fontWeight: 600 }}>
                {p.startsWith(':') ? p : `:${p}`}
              </label>
              <input
                autoFocus={p === params[0]}
                value={values[p] ?? ''}
                onChange={(e) => handleChange(p, e.target.value)}
                placeholder="Giá trị…"
                style={{
                  height: 26,
                  padding: '0 8px',
                  background: 'var(--pane2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 4,
                  color: 'var(--text)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                }}
              />
            </div>
          ))}
        </div>
      </form>

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
          Huỷ
        </button>
        <button
          onClick={() => onExecute(values)}
          style={{
            padding: '6px 16px',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Chạy câu lệnh ▶
        </button>
      </div>
    </Modal>
  )
}
