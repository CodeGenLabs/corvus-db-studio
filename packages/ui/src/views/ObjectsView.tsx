import { useEffect, useState } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from '../components/useContextMenu'
import { ContextMenu } from '../components/ContextMenu'
import type { ObjectKind, DialogId } from '@corvus/contract'

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
  const ctx = useActiveContext()
  const client = useClient()
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-object-list')

  const tab = activeTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'
  const schema = tab?.identity.type === 'object' ? tab.identity.namespace : undefined
  const database = tab?.identity.type === 'object' ? tab.identity.database : undefined
  const targetKind = s.selectedObjectKind ?? 'table'

  const [objects, setObjects] = useState<ObjectRowItem[]>([])
  const [selectedObject, setSelectedObject] = useState<string | null>(null)

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
          kind: targetKind,
        })

        if (!cancelled && Array.isArray(list)) {
          setObjects(
            list.map((o) => ({
              name: o.name,
              kind: o.kind,
              rows: o.rowCount !== undefined ? o.rowCount.toLocaleString() : '-',
              size: formatBytes(o.sizeBytes),
              engine: o.engine || '-',
              autoInc: o.autoIncrement !== undefined ? String(o.autoIncrement) : '-',
              modified: o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : '-',
            })),
          )
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch objects:', err)
        }
      }
    }

    fetchObjects()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, schema, database, targetKind])

  const handleOpenObject = (name: string) => {
    setSelectedObject(name)
    openTab(
      {
        type: 'object',
        connectionId,
        database,
        namespace: schema,
        name,
        objectKind: targetKind,
        contentKind: 'data',
      },
      { title: name },
    )
  }

  return (
    <div
      data-testid="objects-view"
      onContextMenu={(e) => openContextMenu(e, 'empty')}
      onKeyDown={(e) => handleKeyDown(e, 'empty')}
      style={{ minHeight: '100%' }}
    >
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
        const sel = selectedObject === r.name
        return (
          <div
            key={r.name}
            className="hv-row"
            onClick={() => setSelectedObject(r.name)}
            onDoubleClick={() => handleOpenObject(r.name)}
            onContextMenu={(e) => {
              e.stopPropagation()
              setSelectedObject(r.name)
              openContextMenu(e, 'object')
            }}
            onKeyDown={(e) => handleKeyDown(e, 'object')}
            tabIndex={0}
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

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-object-list"
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
