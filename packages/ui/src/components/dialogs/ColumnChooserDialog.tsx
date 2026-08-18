import { useState } from 'react'
import { Modal } from './Modal'

export interface ColumnChooserDialogProps {
  columns: Array<{ name: string; type?: string }>
  initialHidden: string[]
  initialFrozenCount: number
  onClose: () => void
  onApply: (hidden: string[], frozenCount: number) => void
}

export function ColumnChooserDialog({
  columns,
  initialHidden,
  initialFrozenCount,
  onClose,
  onApply,
}: ColumnChooserDialogProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden))
  const [frozenCount, setFrozenCount] = useState<number>(initialFrozenCount)

  const toggleColumn = (colName: string) => {
    const next = new Set(hidden)
    if (next.has(colName)) next.delete(colName)
    else next.add(colName)
    setHidden(next)
  }

  const handleSelectAll = () => setHidden(new Set())
  const handleDeselectAll = () => setHidden(new Set(columns.map((c) => c.name)))

  return (
    <Modal onClose={onClose} surface={{ width: 440, height: 420, display: 'flex', flexDirection: 'column' }}>
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
        <span>👁️ Tuỳ chọn Cột hiển thị (Column Chooser)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span>Đóng băng cột (Freeze):</span>
          <input
            type="number"
            min={0}
            max={columns.length}
            value={frozenCount}
            onChange={(e) => setFrozenCount(Number(e.target.value))}
            style={{ width: 60, height: 22, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }}
          />
          <span style={{ color: 'var(--text3)' }}>cột đầu tiên</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSelectAll}
            style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            Hiện tất cả
          </button>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <button
            onClick={handleDeselectAll}
            style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}
          >
            Ẩn tất cả
          </button>
        </div>

        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, overflow: 'auto', background: 'var(--pane)', padding: 6 }}>
          {columns.map((col) => {
            const isVisible = !hidden.has(col.name)
            return (
              <label
                key={col.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 11.5,
                  color: isVisible ? 'var(--text)' : 'var(--text3)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleColumn(col.name)}
                />
                <span style={{ fontWeight: 500 }}>{col.name}</span>
                {col.type && <span style={{ color: 'var(--text3)', fontSize: 10.5, marginLeft: 'auto' }}>{col.type}</span>}
              </label>
            )
          })}
        </div>
      </div>

      <div
        style={{
          height: 44,
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
          style={{ padding: '5px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', fontSize: 11.5, cursor: 'pointer' }}
        >
          Huỷ
        </button>
        <button
          onClick={() => {
            onApply(Array.from(hidden), frozenCount)
            onClose()
          }}
          style={{ padding: '5px 16px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Áp dụng
        </button>
      </div>
    </Modal>
  )
}
