import { useState } from 'react'
import { Modal } from './Modal'

export interface ForeignKeyLookupItem {
  id: string | number
  label: string
  details?: string
}

export interface ForeignKeyLookupDialogProps {
  columnName: string
  referencedTable: string
  referencedColumn: string
  currentValue?: string | number
  items: ForeignKeyLookupItem[]
  onClose: () => void
  onSelect: (selectedId: string | number) => void
}

export function ForeignKeyLookupDialog({
  columnName,
  referencedTable,
  referencedColumn,
  currentValue,
  items,
  onClose,
  onSelect,
}: ForeignKeyLookupDialogProps) {
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | number | undefined>(currentValue)

  const filtered = items.filter(
    (item) =>
      String(item.id).toLowerCase().includes(filter.toLowerCase()) ||
      item.label.toLowerCase().includes(filter.toLowerCase()) ||
      (item.details && item.details.toLowerCase().includes(filter.toLowerCase())),
  )

  const handleConfirm = () => {
    if (selectedId !== undefined) {
      onSelect(selectedId)
      onClose()
    }
  }

  return (
    <Modal onClose={onClose} surface={{ width: 540, height: 420, display: 'flex', flexDirection: 'column' }}>
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
        <span>🔗 Chọn giá trị khoá ngoại (Foreign Key Lookup) - <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{columnName}</strong></span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
          Tham chiếu đến: <strong style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{referencedTable}.{referencedColumn}</strong>
        </div>

        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Tìm kiếm ID hoặc tên bản ghi…"
          style={{
            height: 26,
            padding: '0 8px',
            background: 'var(--pane2)',
            border: '1px solid var(--border-strong)',
            borderRadius: 4,
            color: 'var(--text)',
            fontSize: 11.5,
          }}
        />

        <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--pane)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>
              Không tìm thấy bản ghi nào khớp với từ khoá.
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedId === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={() => {
                    onSelect(item.id)
                    onClose()
                  }}
                  className="hv-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--grid-line)',
                    background: isSelected ? 'var(--sel)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 11.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                      #{item.id}
                    </span>
                    <strong style={{ color: 'var(--text)' }}>{item.label}</strong>
                  </div>
                  {item.details && <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{item.details}</span>}
                </div>
              )
            })
          )}
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
          onClick={handleConfirm}
          disabled={selectedId === undefined}
          style={{
            padding: '6px 16px',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: selectedId === undefined ? 'not-allowed' : 'pointer',
          }}
        >
          Chọn giá trị
        </button>
      </div>
    </Modal>
  )
}
