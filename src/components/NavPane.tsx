import { dbMark, ICON_COLOR, ICONS, iconKey } from '../data/icons'
import { TREE } from '../data/schema'
import { SearchIcon } from './SearchIcon'
import { useStudio } from '../store/studio'
import type { TreeNode } from '../types'

function flatten(open: Record<string, boolean>): { n: TreeNode; open: boolean }[] {
  const out: { n: TreeNode; open: boolean }[] = []
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      const isOpen = !!open[n.label]
      out.push({ n, open: isOpen })
      if (isOpen && n.children) walk(n.children)
    }
  }
  walk(TREE)
  return out
}

export function NavPane() {
  const { s, set, t, rowH, navOpen, beginDrag } = useStudio()

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
          <span style={{ fontFamily: 'var(--mono)', textTransform: 'none', letterSpacing: 0 }}>{TREE.length}</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
          {flatten(s.open).map(({ n, open }, i) => {
            const sel = s.selNode === n.label
            const mark = n.kind === 'conn' ? dbMark(n.meta) : null
            return (
              <div
                key={n.label + i}
                className="hv-pane2"
                onClick={() =>
                  set((prev) => ({
                    selNode: n.label,
                    selTable: n.kind === 'table' ? n.label : prev.selTable,
                    view:
                      n.kind === 'folder' || n.kind === 'db'
                        ? 'objects'
                        : n.kind === 'table'
                          ? 'data'
                          : prev.view,
                    open: n.children ? { ...prev.open, [n.label]: !prev.open[n.label] } : prev.open,
                  }))
                }
                onDoubleClick={() => {
                  if (n.kind === 'table') set({ selTable: n.label, selNode: n.label, view: 'data' })
                  else if (n.children) set((prev) => ({ open: { ...prev.open, [n.label]: true } }))
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: rowH,
                  padding: `0 8px 0 ${8 + n.depth * 14}px`,
                  cursor: 'pointer',
                  background: sel ? 'var(--sel)' : 'transparent',
                  borderLeft: '2px solid ' + (sel ? 'var(--accent)' : 'transparent'),
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
                    visibility: n.children ? 'visible' : 'hidden',
                    transform: open ? 'rotate(90deg)' : 'none',
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
                    stroke: mark ? mark[1] : ICON_COLOR[iconKey(n)],
                    opacity: n.kind === 'folder' ? 0.95 : 1,
                  }}
                >
                  <path d={mark ? mark[0] : ICONS[iconKey(n)]} />
                </svg>

                <span
                  style={{
                    fontWeight: n.depth === 0 ? 600 : 400,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {n.label}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {n.meta}
                </span>
              </div>
            )
          })}
        </div>

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
