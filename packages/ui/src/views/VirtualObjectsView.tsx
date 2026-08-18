import { useState, useMemo } from 'react'

export interface DatabaseObjectItem {
  name: string
  type: 'table' | 'view' | 'routine' | 'trigger'
  schema?: string
  rowCount?: number
  dataSize?: string
  updatedAt?: string
}

export interface VirtualObjectsViewProps {
  objects: DatabaseObjectItem[]
  onOpenObject?: (obj: DatabaseObjectItem) => void
}

export function VirtualObjectsView({ objects, onOpenObject }: VirtualObjectsViewProps) {
  const [filterText, setFilterText] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'table' | 'view' | 'routine' | 'trigger'>('all')

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      const matchType = typeFilter === 'all' || obj.type === typeFilter
      const matchText = !filterText || obj.name.toLowerCase().includes(filterText.toLowerCase())
      return matchType && matchText
    })
  }, [objects, filterText, typeFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--pane)', fontSize: 11 }}>
      <div
        style={{
          height: 34,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <input
          placeholder="Lọc danh sách đối tượng…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ width: 200, height: 22, padding: '0 6px', background: 'var(--pane)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          style={{ height: 22, padding: '0 4px', background: 'var(--pane)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)' }}
        >
          <option value="all">Tất cả kiểu ({objects.length})</option>
          <option value="table">Bảng (Tables)</option>
          <option value="view">Views</option>
          <option value="routine">Hàm / Thủ tục (Routines)</option>
          <option value="trigger">Triggers</option>
        </select>
        <span style={{ marginLeft: 'auto', color: 'var(--text3)' }}>
          Hiển thị: {filteredObjects.length} / {objects.length}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--pane2)', zIndex: 1, borderBottom: '1px solid var(--border-strong)' }}>
            <tr>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Tên đối tượng</th>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)', width: 80 }}>Kiểu</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text2)', width: 100 }}>Số dòng</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text2)', width: 90 }}>Dung lượng</th>
              <th style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text2)', width: 120 }}>Ngày cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {filteredObjects.map((obj, idx) => (
              <tr
                key={idx}
                onDoubleClick={() => onOpenObject?.(obj)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <td style={{ padding: '5px 10px', fontWeight: 500, color: 'var(--text)' }}>
                  {obj.name}
                </td>
                <td style={{ padding: '5px 10px', color: 'var(--accent)', textTransform: 'capitalize' }}>
                  {obj.type}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text2)' }}>
                  {obj.rowCount !== undefined ? obj.rowCount.toLocaleString() : '—'}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text3)' }}>
                  {obj.dataSize || '—'}
                </td>
                <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--text3)' }}>
                  {obj.updatedAt || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
