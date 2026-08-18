import { useState } from 'react'
import { Modal } from './Modal'

export interface CellEditorDialogProps {
  columnName: string
  initialValue: any
  dataType?: string
  readOnly?: boolean
  onClose: () => void
  onSave: (value: any) => void
}

export function CellEditorDialog({
  columnName,
  initialValue,
  dataType = 'TEXT',
  readOnly = false,
  onClose,
  onSave,
}: CellEditorDialogProps) {
  const [activeTab, setActiveTab] = useState<'text' | 'json' | 'hex'>('text')
  const [value, setValue] = useState(
    typeof initialValue === 'object' ? JSON.stringify(initialValue, null, 2) : String(initialValue ?? ''),
  )

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(value)
      setValue(JSON.stringify(parsed, null, 2))
    } catch {
      // ignore invalid json
    }
  }

  return (
    <Modal onClose={onClose} surface={{ width: 620, height: 440, display: 'flex', flexDirection: 'column' }}>
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
        <span>📝 Chỉnh sửa ô: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{columnName}</strong> ({dataType})</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => setActiveTab('text')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeTab === 'text' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'text' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeTab === 'text' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Text / Memo
          </button>
          <button
            onClick={() => setActiveTab('json')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeTab === 'json' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'json' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeTab === 'json' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            JSON
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'json' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <button
              onClick={handleFormatJson}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }}
            >
              ✨ Định dạng JSON
            </button>
          </div>
        )}

        <textarea
          readOnly={readOnly}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{
            flex: 1,
            width: '100%',
            background: 'var(--pane)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: 'var(--text)',
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
            padding: 10,
            lineHeight: 1.5,
            resize: 'none',
          }}
        />
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
        {!readOnly && (
          <button
            onClick={() => onSave(value)}
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
            Lưu thay đổi
          </button>
        )}
      </div>
    </Modal>
  )
}
