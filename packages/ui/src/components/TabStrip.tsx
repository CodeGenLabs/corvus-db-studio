import { useStudio } from '../store/studio'
import type { View } from '../types'

export function TabStrip() {
  const { s, t, tr, setView } = useStudio()
  const view = s.view

  const tabs: { v: View; label: string; c: string }[] = [
    { v: 'objects', label: t.tabObjects, c: 'var(--accent)' },
    { v: 'data', label: s.selTable + ' @sakila', c: 'var(--amber)' },
    { v: 'sql', label: t.tabSql, c: 'var(--coral)' },
    { v: 'design', label: tr('Thiết kế: ', 'Design: ') + s.selTable, c: 'var(--accent)' },
    { v: 'er', label: t.tabEr, c: 'var(--green)' },
    { v: 'compare', label: t.tabCompare, c: 'var(--red)' },
    { v: 'backup', label: t.tbBackup, c: 'var(--coral)' },
    { v: 'jobs', label: t.tabJobs, c: 'var(--text3)' },
  ]

  return (
    <div
      style={{
        height: 30,
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--pane2)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {tabs.map((d) => {
        const active = view === d.v
        return (
          <div
            key={d.v}
            className="hv-text"
            onClick={setView(d.v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 9px',
              maxWidth: 160,
              minWidth: 0,
              flexShrink: 1,
              cursor: 'pointer',
              borderRight: '1px solid var(--border)',
              fontSize: 11.5,
              background: active ? 'var(--pane)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text2)',
              boxShadow: active ? 'inset 0 2px 0 var(--accent)' : 'none',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 2, flex: 'none', background: d.c }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
            <span style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1 }}>×</span>
          </div>
        )
      })}
      <div
        className="hv-accent"
        style={{
          width: 28,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text3)',
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
        }}
      >
        +
      </div>
    </div>
  )
}
