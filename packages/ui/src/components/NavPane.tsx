import { useRef } from 'react'
import { dbMark, ICON_COLOR, ICONS } from '../data/icons'
import { SearchIcon } from './SearchIcon'
import { useClient, useStudio } from '../store/studio'
import { useNavTree, type NavRow } from './useNavTree'
import { CONTENT_FOR_KIND } from '../navigation/contentForKind'

function iconFor(kind: string, label: string): string {
  if (kind === 'folder') return label.toLowerCase().includes('view') ? 'view' : 'table'
  if (kind === 'schema') return 'folder'
  if (kind === 'view' || kind === 'materializedView') return 'view'
  if (kind === 'sequence') return 'query'
  if (kind === 'function' || kind === 'procedure') return 'function'
  if (kind === 'trigger') return 'trigger'
  return kind
}

function colorFor(kind: string, label: string): string {
  return ICON_COLOR[iconFor(kind, label)] ?? 'var(--text3)'
}

export function NavPane() {
  const { s, set, t, rowH, navOpen, beginDrag, openTab } = useStudio()
  const client = useClient()
  const tree = useNavTree(client, s.open, t as unknown as Record<string, string>)
  const treeContainerRef = useRef<HTMLDivElement>(null)

  const handleRowClick = (row: NavRow) => {
    set((prev) => ({
      selNode: row.path,
      open: row.expandable
        ? { ...prev.open, [row.path]: !prev.open[row.path] }
        : prev.open,
    }))

    if (row.level === 'object' && row.ref.object) {
      const objectKind = row.objectKind ?? 'table'
      const contentKind = CONTENT_FOR_KIND[objectKind] ?? 'data'
      openTab({
        type: 'object',
        contentKind,
        connectionId: row.ref.connectionId,
        database: row.ref.database,
        namespace: row.ref.namespace,
        objectKind,
        name: row.ref.object,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const row = tree.rows[index]
    if (!row) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = treeContainerRef.current?.querySelector<HTMLElement>(`[data-nav-index="${index + 1}"]`)
      next?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = treeContainerRef.current?.querySelector<HTMLElement>(`[data-nav-index="${index - 1}"]`)
      prev?.focus()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (row.expandable && !row.open) {
        set((prev) => ({ open: { ...prev.open, [row.path]: true } }))
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (row.expandable && row.open) {
        set((prev) => ({ open: { ...prev.open, [row.path]: false } }))
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleRowClick(row)
    }
  }

  return (
    <>
      <div
        style={{
          width: navOpen ? s.navW : 0,
          flex: 'none',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--pane2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 26,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 0 10px',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text3)',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '.5px',
            textTransform: 'uppercase',
          }}
        >
          <span title={t.navPane} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text2)' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.35}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.2 3.4h11.6M2.2 8h11.6M2.2 12.6h11.6M5.2 1.9v12.2" />
            </svg>
          </span>
          <span style={{ fontFamily: 'var(--mono)', textTransform: 'none', letterSpacing: 0 }}>
            {tree.connectionCount}
          </span>
        </div>

        {/* Tree Container */}
        <div
          ref={treeContainerRef}
          role="tree"
          aria-label={t.navPane}
          style={{ flex: 1, overflow: 'auto', padding: '4px 0', outline: 'none' }}
        >
          {tree.isLoading && <NavMessage text={t.loading} />}
          {tree.error && <NavMessage text={tree.error} tone="error" />}

          {!tree.isLoading && !tree.error && tree.rows.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{t.navEmpty}</div>
              <button
                onClick={() => set({ showConn: true })}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  borderRadius: 4,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                + {t.newConnection}
              </button>
            </div>
          )}

          {tree.rows.map((row, index) => (
            <NavRowView
              key={row.path}
              row={row}
              index={index}
              rowH={rowH}
              selected={s.selNode === row.path}
              onToggle={() => handleRowClick(row)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
          ))}
        </div>

        {/* Filter bar */}
        <div
          style={{
            height: 28,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 10px',
            borderTop: '1px solid var(--border)',
            color: 'var(--text3)',
          }}
        >
          <SearchIcon size={12} />
          <span style={{ fontSize: 11 }}>{t.filterObjects}</span>
        </div>
      </div>

      <div
        className="hv-accent-bg"
        onMouseDown={(e) => beginDrag(e, 'nav')}
        style={{
          width: navOpen ? 4 : 0,
          flex: 'none',
          cursor: 'col-resize',
          background: s.dragPane === 'nav' ? 'var(--accent)' : 'transparent',
          zIndex: 5,
        }}
      />
    </>
  )
}

function NavMessage({ text, tone }: { text: string; tone?: 'error' }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        fontSize: 11,
        color: tone === 'error' ? 'var(--red)' : 'var(--text3)',
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  )
}

interface NavRowViewProps {
  row: NavRow
  index: number
  rowH: number
  selected: boolean
  onToggle: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

function NavRowView({ row, index, rowH, selected, onToggle, onKeyDown }: NavRowViewProps) {
  const mark = row.kind === 'conn' ? dbMark(row.meta) : null
  const iconKey = iconFor(row.kind, row.label)

  return (
    <div
      className="hv-pane2"
      data-testid={`nav-row-${row.path}`}
      data-nav-index={index}
      role="treeitem"
      tabIndex={0}
      aria-expanded={row.expandable ? row.open : undefined}
      aria-level={row.depth + 1}
      aria-selected={selected}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      title={row.error ?? row.path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: rowH,
        padding: `0 8px 0 ${8 + row.depth * 14}px`,
        cursor: 'pointer',
        background: selected ? 'var(--sel)' : 'transparent',
        borderLeft: '2px solid ' + (selected ? 'var(--accent)' : 'transparent'),
        outline: 'none',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 10,
          flex: 'none',
          color: 'var(--text3)',
          visibility: row.expandable ? 'visible' : 'hidden',
          transform: row.open ? 'rotate(90deg)' : 'none',
          transition: 'transform .12s',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M6 3.5l5 4.5-5 4.5" />
        </svg>
      </span>

      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        strokeWidth={1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          flex: 'none',
          stroke: row.error ? 'var(--red)' : mark ? mark[1] : colorFor(row.kind, row.label),
          opacity: row.kind === 'folder' ? 0.95 : 1,
        }}
      >
        <path d={mark ? mark[0] : (ICONS[iconKey] ?? ICONS.folder)} />
      </svg>

      <span
        style={{
          fontWeight: row.depth === 0 ? 600 : 400,
          color: row.error ? 'var(--red)' : 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {row.label}
      </span>

      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
        {row.loading ? '…' : row.error ? '!' : row.meta}
      </span>
    </div>
  )
}
