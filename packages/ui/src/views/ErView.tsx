import { useEffect, useState, useRef } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from '../components/useContextMenu'
import { ContextMenu } from '../components/ContextMenu'
import type { TableMeta, DialogId } from '@corvus/contract'

const KEY_COLOR: Record<string, string> = {
  PK: 'var(--amber)',
  FK: 'var(--accent)',
  UQ: 'var(--coral)',
  '': 'transparent',
}

interface ErEntity {
  name: string
  x: number
  y: number
  w: number
  fields: Array<[string, string, string]> // [key, name, type]
  foreignKeys: Array<{ column: string; refTable: string; refColumn: string }>
}

const DEFAULT_ER: ErEntity[] = [
  {
    name: 'customer',
    x: 40,
    y: 40,
    w: 210,
    fields: [
      ['PK', 'customer_id', 'INT'],
      ['', 'first_name', 'VARCHAR'],
      ['', 'last_name', 'VARCHAR'],
      ['', 'email', 'VARCHAR'],
      ['FK', 'address_id', 'INT'],
      ['', 'active', 'TINYINT'],
    ],
    foreignKeys: [{ column: 'address_id', refTable: 'address', refColumn: 'address_id' }],
  },
  {
    name: 'address',
    x: 340,
    y: 40,
    w: 210,
    fields: [
      ['PK', 'address_id', 'INT'],
      ['', 'address', 'VARCHAR'],
      ['', 'district', 'VARCHAR'],
      ['FK', 'city_id', 'INT'],
      ['', 'postal_code', 'VARCHAR'],
    ],
    foreignKeys: [{ column: 'city_id', refTable: 'city', refColumn: 'city_id' }],
  },
  {
    name: 'city',
    x: 640,
    y: 40,
    w: 200,
    fields: [
      ['PK', 'city_id', 'INT'],
      ['', 'city', 'VARCHAR'],
      ['FK', 'country_id', 'INT'],
    ],
    foreignKeys: [{ column: 'country_id', refTable: 'country', refColumn: 'country_id' }],
  },
  {
    name: 'country',
    x: 640,
    y: 240,
    w: 200,
    fields: [
      ['PK', 'country_id', 'INT'],
      ['', 'country', 'VARCHAR'],
    ],
    foreignKeys: [],
  },
]

export function ErView() {
  const { set, openTab, activeTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-er-diagram')

  const tab = activeTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'
  const schema = tab?.identity.type === 'object' ? tab.identity.namespace : undefined

  const [entities, setEntities] = useState<ErEntity[]>(DEFAULT_ER)
  const [scale, setScale] = useState(1)
  const [draggingEntity, setDraggingEntity] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Tải metadata ER từ introspect
  useEffect(() => {
    let cancelled = false
    async function loadErDiagram() {
      try {
        const objects = await client.request<Array<{ name: string; kind: string }>>('introspect.objects', {
          connectionId,
          schema,
          kind: 'table',
        })

        if (!cancelled && Array.isArray(objects) && objects.length > 0) {
          const loadedEntities: ErEntity[] = []
          const colsCount = 3
          const boxWidth = 220
          const xGap = 80
          const yGap = 60

          for (let i = 0; i < Math.min(objects.length, 12); i++) {
            const obj = objects[i]
            if (!obj) continue
            try {
              const meta = await client.request<TableMeta>('introspect.tableMeta', {
                connectionId,
                schema,
                table: obj.name,
              })

              const row = Math.floor(i / colsCount)
              const col = i % colsCount
              const x = 40 + col * (boxWidth + xGap)
              const y = 40 + row * (220 + yGap)

              const fields: Array<[string, string, string]> = meta.columns.map((c) => {
                const isFk = meta.foreignKeys?.some((fk) => fk.column === c.name)
                const key = c.isPrimaryKey ? 'PK' : isFk ? 'FK' : ''
                return [key, c.name, (c.dataType || 'VARCHAR').toUpperCase()]
              })

              const fks = (meta.foreignKeys || []).map((fk) => ({
                column: fk.column,
                refTable: fk.referencedTable,
                refColumn: fk.referencedColumn,
              }))

              loadedEntities.push({
                name: obj.name,
                x,
                y,
                w: boxWidth,
                fields,
                foreignKeys: fks,
              })
            } catch {
              // skip single table error
            }
          }

          if (!cancelled && loadedEntities.length > 0) {
            setEntities(loadedEntities)
          }
        }
      } catch {
        // Fallback default
      }
    }

    loadErDiagram()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, schema])

  const handleMouseDown = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = entities.find((x) => x.name === name)
    if (!target) return
    setDraggingEntity(name)
    setDragOffset({
      x: e.clientX - target.x * scale,
      y: e.clientY - target.y * scale,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingEntity) return
    const newX = (e.clientX - dragOffset.x) / scale
    const newY = (e.clientY - dragOffset.y) / scale
    setEntities((prev) =>
      prev.map((ent) => (ent.name === draggingEntity ? { ...ent, x: Math.max(10, newX), y: Math.max(10, newY) } : ent)),
    )
  }

  const handleMouseUp = () => {
    setDraggingEntity(null)
  }

  return (
    <div
      ref={containerRef}
      data-testid="er-view"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => openContextMenu(e, 'empty')}
      onKeyDown={(e) => handleKeyDown(e, 'empty')}
      style={{
        height: '100%',
        position: 'relative',
        background: 'var(--pane2)',
        backgroundImage: 'radial-gradient(var(--grid-line) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        overflow: 'auto',
        userSelect: draggingEntity ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          inset: 0,
          minWidth: 1600,
          minHeight: 1200,
        }}
      >
        {/* SVG Relationship Connector Lines */}
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        >
          {entities.flatMap((source) =>
            source.foreignKeys.map((fk, idx) => {
              const target = entities.find((x) => x.name === fk.refTable)
              if (!target) return null

              const x1 = source.x + source.w
              const y1 = source.y + 30
              const x2 = target.x
              const y2 = target.y + 30
              const midX = (x1 + x2) / 2

              return (
                <path
                  key={`${source.name}-${target.name}-${idx}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                />
              )
            }),
          )}
        </svg>

        {entities.map((e) => (
          <div
            key={e.name}
            onMouseDown={(ev) => handleMouseDown(e.name, ev)}
            style={{
              position: 'absolute',
              left: e.x,
              top: e.y,
              width: e.w,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              boxShadow: '0 3px 10px rgba(0,0,0,.15)',
              overflow: 'hidden',
              cursor: draggingEntity === e.name ? 'grabbing' : 'grab',
              zIndex: draggingEntity === e.name ? 10 : 1,
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                fontWeight: 600,
                fontSize: 11.5,
                fontFamily: 'var(--mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{e.name}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{e.fields.length} cols</span>
            </div>
            <div style={{ maxHeight: 220, overflow: 'auto' }}>
              {e.fields.map((f, i) => (
                <div
                  key={`${f[1]}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '18px 1fr auto',
                    gap: 6,
                    alignItems: 'center',
                    padding: '3px 8px',
                    borderTop: '1px solid var(--grid-line)',
                    fontSize: 11,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: KEY_COLOR[f[0]] || 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {f[0]}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{f[1]}</span>
                  <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10 }}>{f[2]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Zoom / Scale Controls */}
      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          padding: '2px 6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 50,
        }}
      >
        <button
          onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
          style={{ width: 22, height: 22, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}
        >
          −
        </button>
        <div style={{ padding: '0 6px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', minWidth: 44, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={() => setScale((s) => Math.min(1.8, Number((s + 0.1).toFixed(1))))}
          style={{ width: 22, height: 22, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}
        >
          +
        </button>
      </div>

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-er-diagram"
          targetKind={menuState.targetKind}
          activeContext={ctx}
          commandContext={{
            active: ctx,
            client,
            openTab,
            openDialog: (d) => set({ dialog: d as DialogId }),
          }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
