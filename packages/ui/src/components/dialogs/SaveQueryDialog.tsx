import { useState } from 'react'
import { Modal } from './Modal'

export interface SaveQueryDialogProps {
  initialTitle?: string
  sqlContent: string
  onClose: () => void
  onSave: (title: string, destination: 'workspace' | 'file') => void
}

export function SaveQueryDialog({
  initialTitle = 'New Query',
  sqlContent,
  onClose,
  onSave,
}: SaveQueryDialogProps) {
  const [title, setTitle] = useState(initialTitle)
  const [destination, setDestination] = useState<'workspace' | 'file'>('workspace')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave(title.trim(), destination)
  }

  return (
    <Modal onClose={onClose} surface={{ width: 500, height: 320, display: 'flex', flexDirection: 'column' }}>
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
        <span>💾 Lưu truy vấn SQL (Save Query)</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên truy vấn:</label>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              height: 26,
              padding: '0 8px',
              background: 'var(--pane2)',
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              color: 'var(--text)',
              fontSize: 11.5,
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>Nơi lưu:</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="save-dest"
                checked={destination === 'workspace'}
                onChange={() => setDestination('workspace')}
              />
              <span>Lưu vào không gian làm việc Corvus Workspace (Bộ nhớ trong)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="save-dest"
                checked={destination === 'file'}
                onChange={() => setDestination('file')}
              />
              <span>Lưu thành tệp ngoài (.sql) qua FileGateway</span>
            </label>
          </div>
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
          Kích thước câu lệnh: {sqlContent.length} ký tự
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
          onClick={() => onSave(title, destination)}
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
          Lưu truy vấn
        </button>
      </div>
    </Modal>
  )
}
