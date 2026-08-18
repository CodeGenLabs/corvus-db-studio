import React from 'react'

export interface DiagramNode {
  id: string
  label: string
  x: number
  y: number
  width?: number
  height?: number
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface DiagramCanvasProps {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  onNodeMove?: (id: string, x: number, y: number) => void
  onNodeSelect?: (id: string) => void
  onEdgeSelect?: (id: string) => void
}

/**
 * Calculates hierarchical auto layout grid coordinates
 */
export function calculateAutoLayout(nodes: DiagramNode[], columns = 4, spacingX = 260, spacingY = 180): DiagramNode[] {
  return nodes.map((node, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    return {
      ...node,
      x: col * spacingX + 40,
      y: row * spacingY + 40,
    }
  })
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  nodes,
  edges,
  onNodeSelect,
  onEdgeSelect,
}) => {
  return (
    <div
      className="relative w-full h-full overflow-auto bg-dot-pattern select-none"
      style={{
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: 'var(--bg-canvas, #090d16)',
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge) => {
          const src = nodes.find((n) => n.id === edge.source)
          const tgt = nodes.find((n) => n.id === edge.target)
          if (!src || !tgt) return null

          const x1 = src.x + 100
          const y1 = src.y + 40
          const x2 = tgt.x + 100
          const y2 = tgt.y + 40

          return (
            <g key={edge.id} className="cursor-pointer pointer-events-auto" onClick={() => onEdgeSelect?.(edge.id)}>
              <path
                d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="var(--accent, #3b82f6)"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            </g>
          )
        })}
      </svg>

      {nodes.map((node) => (
        <div
          key={node.id}
          onClick={() => onNodeSelect?.(node.id)}
          className="absolute z-10 p-3 rounded-lg border bg-[var(--bg-surface,#161b26)] border-[var(--border,#272e3f)] shadow-md hover:border-[var(--accent,#3b82f6)] cursor-pointer transition-colors"
          style={{
            left: `${node.x}px`,
            top: `${node.y}px`,
            minWidth: '180px',
          }}
        >
          <div className="font-medium text-xs text-[var(--text-bright,#f1f5f9)]">{node.label}</div>
        </div>
      ))}
    </div>
  )
}
