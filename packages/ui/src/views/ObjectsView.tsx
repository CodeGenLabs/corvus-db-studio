import { useEffect, useState } from 'react'
import { useStudio, useClient } from '../store/studio'
import type { ObjectKind } from '@corvus/contract'

const COLS = '1fr 110px 130px 110px 110px 150px'

interface ObjectRowItem {
  name: string
  kind: ObjectKind
  rows: string
  size: string
  engine: string
  autoInc: string
  modified: string
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function ObjectsView() {
  const { s, set, t, row, activeTab, openTab } = useStudio()
  const client = useClient()

  const tab = activeTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'
  const schema = tab?.identity.type === 'object' ? tab.identity.namespace : undefined
  const database = tab?.identity.type === 'object' ? tab.identity.database : undefined

  const [objects, setObjects] = useState<ObjectRowItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function fetchObjects() {
      try {
        const list = await client.request<Array<{
          name: string
          kind: ObjectKind
          rowCount?: number
          sizeBytes?: number
          engine?: string
          autoIncrement?: number
          updatedAt?: string
        }>>('introspect.objects', {
          connectionId,
          schema,
          kind: 'table',
        })

        if (!cancelled && Array.isArray(list)) {
          setObjects(
            list.map((o) => ({
              name: o.name,
              kind: o.kind,
              rows: o.rowCount !== undefined ? o.rowCount.toLocaleString() : '-',
              size: formatBytes(o.sizeBytes),
              engine: o.engine || '—',
              autoInc: o.autoIncrement !== undefined ? String(o.autoIncrement) : '-',
              modified: o.updatedAt || '-',
            })),
          )
        }
      } catch {
        if (!cancelled) {
          setObjects([])
        }
      }
    }

    fetchObjects()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, schema, database])

  const handleOpenObject = (name: string) => {
    set({ selTable: name })
    openTab(
      {
        type: 'object',
        connectionId,
        database,
        namespace: schema,
        name,
        objectKind: 'table',
        contentKind: 'data',
      },
      { title: name },
    )
  }

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: COLS,
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border-strong)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text2)',
        }}
      >
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)' }}>{t.cName}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.cRows}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.cDataLen}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)' }}>{t.cEngine}</div>
        <div style={{ padding: '5px 10px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.cAutoInc}</div>
        <div style={{ padding: '5px 10px' }}>{t.cModified}</div>
      </div>

      {objects.map((r) => {
        const sel = s.selTable === r.name
        return (
          <div
            key={r.name}
            className="hv-row"
            onClick={() => set({ selTable: r.name })}
            onDoubleClick={() => handleOpenObject(r.name)}
            style={row({
              display: 'grid',
              gridTemplateColumns: COLS,
              background: sel ? 'var(--sel)' : 'transparent',
              cursor: 'pointer',
            })}
          >
            <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
              <span
                style={{
                  width: 11,
                  height: 9,
                  flex: 'none',
                  border: '1px solid var(--accent)',
                  borderTopWidth: 3,
                  borderRadius: 1.5,
                }}
              />
              <span
                style={{
                  fontWeight: sel ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: sel ? 'var(--accent)' : 'var(--text)',
                }}
              >
                {r.name}
              </span>
            </div>
            <div style={{ padding: '0 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.rows}</div>
            <div style={{ padding: '0 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.size}</div>
            <div style={{ padding: '0 10px', color: 'var(--text2)' }}>{r.engine}</div>
            <div style={{ padding: '0 10px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>{r.autoInc}</div>
            <div style={{ padding: '0 10px', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{r.modified}</div>
          </div>
        )
      })}
    </div>
  )
}
