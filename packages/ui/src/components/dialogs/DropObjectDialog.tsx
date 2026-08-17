import { useState } from 'react'
import { Modal } from './Modal'

export interface DropObjectDialogProps {
  objectName: string
  objectType: 'table' | 'view' | 'index' | 'routine'
  dependencies?: string[]
  onClose: () => void
  onConfirmDrop: () => void
}

export function DropObjectDialog({
  objectName,
  objectType,
  dependencies = [],
  onClose,
  onConfirmDrop,
}: DropObjectDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')

  const isMatched = confirmInput === objectName

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
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>🗑️ Xoá đối tượng (Drop {objectType})</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
          Bạn có chắc chắn muốn xoá vĩnh viễn {objectType} <strong style={{ color: '#ef4444', fontFamily: 'var(--mono)' }}>{objectName}</strong>? Thao tác này không thể hoàn tác!
        </p>

        {dependencies.length > 0 && (
          <div style={{ padding: 10, borderRadius: 6, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: 11, color: 'var(--amber)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Các đối tượng phụ thuộc có thể bị ảnh hưởng:</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {dependencies.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            Để xác nhận, vui lòng gõ lại chính xác tên đối tượng <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{objectName}</strong>:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={objectName}
            style={{
              width: '100%',
              height: 28,
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
          Huỷ
        </button>
        <button
          onClick={onConfirmDrop}
          disabled={!isMatched}
          style={{
            padding: '6px 16px',
            border: 'none',
            background: '#ef4444',
            color: '#ffffff',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: isMatched ? 'pointer' : 'not-allowed',
            opacity: isMatched ? 1 : 0.4,
          }}
        >
          Xoá đối tượng
        </button>
      </div>
    </Modal>
  )
}
