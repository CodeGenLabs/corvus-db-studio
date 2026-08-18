import { useState } from 'react'
import { Modal } from './Modal'

export interface TableSelectionDialogProps {
  tables: string[]
  initialSelected?: string[]
  maxRecommended?: number
  onClose: () => void
  onConfirm: (selectedTables: string[]) => void
}

export function TableSelectionDialog({
  tables,
  initialSelected = [],
  maxRecommended = 150,
  onClose,
  onConfirm,
}: TableSelectionDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected.length > 0 ? initialSelected : tables.slice(0, maxRecommended)),
  )
  const [search, setSearch] = useState('')

  const filteredTables = tables.filter((t) => t.toLowerCase().includes(search.toLowerCase()))

  const toggleTable = (table: string) => {
    const next = new Set(selected)
    if (next.has(table)) next.delete(table)
    else next.add(table)
    setSelected(next)
  }

  const handleSelectAll = () => setSelected(new Set(tables))
  const handleDeselectAll = () => setSelected(new Set())

  return (
    <Modal onClose={onClose} surface={{ width: 500, height: 460, display: 'flex', flexDirection: 'column' }}>
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
        <span>📊 Chọn Tập Bảng cho ERD Diagram</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tables.length > maxRecommended && (
          <div style={{ padding: 8, borderRadius: 4, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308', fontSize: 11 }}>
            ⚠️ <strong>Schema lớn ({tables.length} bảng):</strong> Để đảm bảo hiệu năng vẽ mượt mà trên canvas, khuyến nghị chọn tối đa {maxRecommended} bảng cùng lúc.
          </div>
        )}

        <input
          placeholder="Lọc tên bảng…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ height: 24, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSelectAll}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
            >
              Chọn tất cả
            </button>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <button
              onClick={handleDeselectAll}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <span style={{ color: 'var(--text3)' }}>
            Đã chọn: {selected.size} / {tables.length} bảng
          </span>
        </div>

        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, overflow: 'auto', background: 'var(--pane)', padding: 6 }}>
          {filteredTables.map((t) => {
            const isChecked = selected.has(t)
            return (
              <label
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 11.5,
                  color: isChecked ? 'var(--text)' : 'var(--text3)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleTable(t)}
                />
                <span style={{ fontWeight: isChecked ? 600 : 400 }}>{t}</span>
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
            onConfirm(Array.from(selected))
            onClose()
          }}
          style={{ padding: '5px 16px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Tải biểu đồ ERD ({selected.size} bảng) ▶
        </button>
      </div>
    </Modal>
  )
}
