export interface AdvancedFormState {
  readOnly: boolean
  color: string
  group: string
  initialDatabase: string
  queryTimeoutSec: number
}

interface AdvancedTabProps {
  state: AdvancedFormState
  onChange: (updates: Partial<AdvancedFormState>) => void
}

const COLOR_PRESETS = [
  '#4a9eff',
  '#4ade80',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
]

export function AdvancedTab({ state, onChange }: AdvancedTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
        <input
          type="checkbox"
          checked={state.readOnly}
          onChange={(e) => onChange({ readOnly: e.target.checked })}
        />
        <span>Chế độ chỉ đọc (Read-only Mode) — Chặn toàn bộ lệnh INSERT/UPDATE/DELETE/DDL</span>
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>Màu đại diện kết nối (Connection Color)</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {COLOR_PRESETS.map((c) => (
            <div
              key={c}
              onClick={() => onChange({ color: c })}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: c,
                cursor: 'pointer',
                border: state.color === c ? '2px solid var(--text)' : '2px solid transparent',
              }}
            />
          ))}
          <input
            type="text"
            value={state.color}
            onChange={(e) => onChange({ color: e.target.value })}
            style={{
              width: 80,
              height: 22,
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              background: 'var(--pane2)',
              color: 'var(--text)',
              padding: '0 6px',
              fontFamily: 'var(--mono)',
              fontSize: 11,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>Nhóm ảo (Virtual Group)</span>
        <input
          type="text"
          value={state.group}
          onChange={(e) => onChange({ group: e.target.value })}
          placeholder="e.g. Production, Staging, Analytics"
          style={{
            height: 24,
            border: '1px solid var(--border-strong)',
            borderRadius: 5,
            background: 'var(--pane2)',
            color: 'var(--text)',
            padding: '0 8px',
            fontSize: 11.5,
          }}
        />
      </div>
    </div>
  )
}
