export interface DependencyItem {
  name: string
  type: 'table' | 'view' | 'routine' | 'foreign_key' | 'trigger'
  schema?: string
}

export interface DependenciesTabProps {
  using: DependencyItem[]
  usedBy: DependencyItem[]
  onSelectObject?: (dep: DependencyItem) => void
}

export function DependenciesTab({ using, usedBy, onSelectObject }: DependenciesTabProps) {
  return (
    <div style={{ padding: 10, fontSize: 11, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>➡️ Phụ thuộc vào (Depends On / Using):</span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>({using.length})</span>
        </div>
        {using.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontStyle: 'italic', paddingLeft: 8 }}>Không phụ thuộc đối tượng nào</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {using.map((dep, idx) => (
              <div
                key={idx}
                onClick={() => onSelectObject?.(dep)}
                style={{
                  padding: '4px 8px',
                  background: 'var(--pane2)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: 'var(--accent)', textTransform: 'capitalize', fontSize: 10 }}>[{dep.type}]</span>
                <span style={{ fontWeight: 500 }}>{dep.schema ? `${dep.schema}.${dep.name}` : dep.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⬅️ Được sử dụng bởi (Used By / Dependents):</span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>({usedBy.length})</span>
        </div>
        {usedBy.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontStyle: 'italic', paddingLeft: 8 }}>Không có đối tượng nào phụ thuộc vào bảng này</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {usedBy.map((dep, idx) => (
              <div
                key={idx}
                onClick={() => onSelectObject?.(dep)}
                style={{
                  padding: '4px 8px',
                  background: 'var(--pane2)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: '#10b981', textTransform: 'capitalize', fontSize: 10 }}>[{dep.type}]</span>
                <span style={{ fontWeight: 500 }}>{dep.schema ? `${dep.schema}.${dep.name}` : dep.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
