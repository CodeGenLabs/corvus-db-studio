import type { FieldMapping } from '@corvus/contract'

export interface FieldMappingGridProps {
  mappings: FieldMapping[]
  targetColumns: string[]
  onUpdateMapping: (index: number, updates: Partial<FieldMapping>) => void
  onSmartMatch: () => void
  onDirectMatch: () => void
  onUnmatchAll: () => void
}

export function FieldMappingGrid({
  mappings,
  targetColumns,
  onUpdateMapping,
  onSmartMatch,
  onDirectMatch,
  onUnmatchAll,
}: FieldMappingGridProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={onSmartMatch}
          style={{
            height: 22,
            padding: '0 8px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 4,
            color: 'var(--text)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          ✨ Smart Match
        </button>
        <button
          onClick={onDirectMatch}
          style={{
            height: 22,
            padding: '0 8px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 4,
            color: 'var(--text)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Direct Match
        </button>
        <button
          onClick={onUnmatchAll}
          style={{
            height: 22,
            padding: '0 8px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 4,
            color: 'var(--text3)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Bỏ khớp tất cả
        </button>
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 4,
          overflow: 'hidden',
          background: 'var(--pane2)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 140px 60px 60px',
            background: 'var(--pane)',
            borderBottom: '1px solid var(--border)',
            padding: '6px 10px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text2)',
          }}
        >
          <div>Trường nguồn (File)</div>
          <div>Trường đích (DB)</div>
          <div>Kiểu đích</div>
          <div style={{ textAlign: 'center' }}>Khoá</div>
          <div style={{ textAlign: 'center' }}>Bỏ qua</div>
        </div>

        {mappings.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 140px 60px 60px',
              padding: '6px 10px',
              borderBottom: idx === mappings.length - 1 ? 'none' : '1px solid var(--grid-line)',
              alignItems: 'center',
              fontSize: 11.5,
              opacity: m.ignored ? 0.4 : 1,
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>
              {m.sourceField}
            </div>

            <div>
              <select
                value={m.targetField}
                onChange={(e) => onUpdateMapping(idx, { targetField: e.target.value })}
                disabled={m.ignored}
                style={{
                  width: '100%',
                  height: 22,
                  background: 'var(--pane)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 3,
                  color: 'var(--text)',
                  fontSize: 11,
                  padding: '0 4px',
                }}
              >
                {targetColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                value={m.targetType}
                onChange={(e) => onUpdateMapping(idx, { targetType: e.target.value })}
                disabled={m.ignored}
                style={{
                  width: '100%',
                  height: 22,
                  background: 'var(--pane)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 3,
                  color: 'var(--text2)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  padding: '0 6px',
                }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={!!m.isKey}
                onChange={(e) => onUpdateMapping(idx, { isKey: e.target.checked })}
                disabled={m.ignored}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={!!m.ignored}
                onChange={(e) => onUpdateMapping(idx, { ignored: e.target.checked })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
