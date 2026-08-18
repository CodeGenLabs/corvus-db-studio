export interface ExplainNode {
  id: string
  operation: string
  table?: string
  cost: number
  rows: number
  actualTime?: string
  filter?: string
  children?: ExplainNode[]
}

export interface ExplainTreeProps {
  rootNode: ExplainNode
}

export function ExplainTree({ rootNode }: ExplainTreeProps) {
  const maxCost = 5000 // reference for cost bar ratio

  const renderNode = (node: ExplainNode, depth = 0) => {
    const isExpensive = node.cost > 1000
    const barWidth = Math.min(100, Math.max(5, (node.cost / maxCost) * 100))

    return (
      <div key={node.id} style={{ marginLeft: depth * 20, marginBottom: 8 }}>
        <div
          style={{
            border: isExpensive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
            borderRadius: 6,
            background: isExpensive ? 'rgba(239, 68, 68, 0.05)' : 'var(--pane)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11.5,
          }}
        >
          <span style={{ fontSize: 13 }}>{isExpensive ? '🔥' : '⚙️'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              {node.operation} {node.table && <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>ON {node.table}</span>}
            </div>
            {node.filter && (
              <div style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                Filter: {node.filter}
              </div>
            )}
          </div>

          <div style={{ width: 100, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)' }}>
              <span>Cost</span>
              <strong style={{ color: isExpensive ? '#ef4444' : 'var(--text)' }}>{node.cost}</strong>
            </div>
            <div style={{ height: 4, background: 'var(--pane2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${barWidth}%`, height: '100%', background: isExpensive ? '#ef4444' : 'var(--accent)' }} />
            </div>
          </div>

          <div style={{ minWidth: 80, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
            {node.rows} rows
          </div>
        </div>

        {node.children && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div style={{ padding: 12, overflow: 'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
        🌳 Cây kế hoạch thực thi truy vấn (Query Execution Plan)
      </div>
      {renderNode(rootNode)}
    </div>
  )
}
