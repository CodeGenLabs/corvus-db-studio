import { useState } from 'react'

export interface QueryHistoryEntry {
  id: string
  sql: string
  executedAt: string
  durationMs: number
  rowsAffected?: number
  status: 'success' | 'error'
  errorMessage?: string
}

export interface QueryHistoryPanelProps {
  entries: QueryHistoryEntry[]
  onInsertSql: (sql: string) => void
  onClear: () => void
}

export function QueryHistoryPanel({
  entries,
  onInsertSql,
  onClear,
}: QueryHistoryPanelProps) {
  const [filter, setFilter] = useState('')

  const filtered = entries.filter((e) =>
    e.sql.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--pane)' }}>
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text2)' }}>📜 Lịch sử truy vấn ({entries.length})</span>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Lọc lịch sử…"
          style={{
            height: 20,
            padding: '0 6px',
            background: 'var(--pane)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text)',
            fontSize: 10.5,
            marginLeft: 'auto',
            width: 140,
          }}
        />
        <button
          onClick={onClear}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text3)',
            fontSize: 10.5,
            cursor: 'pointer',
          }}
        >
          Xoá hết
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>
            Chưa có lịch sử truy vấn nào
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: '6px 8px',
                background: 'var(--pane2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
                <span>
                  {item.status === 'success' ? '✅' : '❌'} {item.executedAt} ({item.durationMs}ms)
                </span>
                <button
                  onClick={() => onInsertSql(item.sql)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent)',
                    fontSize: 10.5,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Chèn vào Editor ↗
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 60,
                  overflow: 'hidden',
                  lineHeight: 1.4,
                }}
              >
                {item.sql}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
