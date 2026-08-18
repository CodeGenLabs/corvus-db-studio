import { useState } from 'react'
import { Modal } from './Modal'

export interface BulkEditDialogProps {
  columnName: string
  selectedRowsCount: number
  onClose: () => void
  onApply: (mode: 'set' | 'replace', value: string, replaceSearch?: string) => void
}

export function BulkEditDialog({
  columnName,
  selectedRowsCount,
  onClose,
  onApply,
}: BulkEditDialogProps) {
  const [mode, setMode] = useState<'set' | 'replace'>('set')
  const [newValue, setNewValue] = useState('')
  const [searchValue, setSearchValue] = useState('')

  const handleApply = () => {
    onApply(mode, newValue, mode === 'replace' ? searchValue : undefined)
    onClose()
  }

  return (
    <Modal onClose={onClose} surface={{ width: 480, height: 320, display: 'flex', flexDirection: 'column' }}>
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
        <span>✏️ Chỉnh sửa hàng loạt (Bulk Edit) - Cột <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{columnName}</strong></span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text2)' }}>
          Đang áp dụng thay đổi cho <strong>{selectedRowsCount}</strong> dòng được chọn:
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer' }}>
            <input
              type="radio"
              name="bulk-mode"
              checked={mode === 'set'}
              onChange={() => setMode('set')}
            />
            <span>Gán giá trị mới</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, cursor: 'pointer' }}>
            <input
              type="radio"
              name="bulk-mode"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
            />
            <span>Tìm và thay thế văn bản</span>
          </label>
        </div>

        {mode === 'replace' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Chuỗi cần tìm:</label>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Nhập chuỗi tìm kiếm…"
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
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
            {mode === 'set' ? 'Giá trị mới:' : 'Thay thế bằng:'}
          </label>
          <input
            autoFocus
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Nhập giá trị…"
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
          onClick={handleApply}
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
          Áp dụng ({selectedRowsCount} dòng)
        </button>
      </div>
    </Modal>
  )
}
