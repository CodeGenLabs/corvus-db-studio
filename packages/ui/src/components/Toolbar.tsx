import { useStudio } from '../store/studio'
import type { View } from '../types'

interface Item {
  key: string
  label: string
  d: string[]
  onClick: () => void
  /** View that renders this item as active. */
  activeFor?: View
}

export function Toolbar() {
  const { s, set, t, setView } = useStudio()
  const view = s.view

  const items: Item[] = [
    { key: 'conn', label: t.tbConnection, d: ['M7 3v5M13 3v5', 'M4 8h12v3a6 6 0 01-12 0z', 'M10 17v-3'], onClick: () => set({ showConn: true }) },
    { key: 'newq', label: t.tbNewQuery, d: ['M5 3h7l3 3v11H5z', 'M8 10h5M8 13h4'], onClick: setView('sql') },
    { key: 'table', label: t.tbTable, d: ['M3 4h14v12H3z', 'M3 8h14M8 8v8M12 8v8'], onClick: setView('objects'), activeFor: 'objects' },
    { key: 'view', label: t.tbView, d: ['M2 10s3-4 8-4 8 4 8 4-3 4-8 4-8-4-8-4z', 'M10 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z'], onClick: setView('objects') },
    { key: 'fn', label: t.tbFunction, d: ['M12 4h-1a2 2 0 00-2 2v8a2 2 0 01-2 2H6', 'M6 10h6'], onClick: setView('objects') },
    { key: 'user', label: t.tbUser, d: ['M10 4a3 3 0 100 6 3 3 0 000-6z', 'M4 17c0-3 2.7-5 6-5s6 2 6 5'], onClick: setView('objects') },
    { key: 'sql', label: t.tbQuery, d: ['M4 5h12v10H4z', 'M6.5 8l2 2-2 2M10.5 12h3'], onClick: setView('sql'), activeFor: 'sql' },
    { key: 'bk', label: t.tbBackup, d: ['M10 3v8M7 8l3 3 3-3', 'M4 14v3h12v-3'], onClick: setView('backup') },
    {
      key: 'auto',
      label: t.tbAutomation,
      d: [
        'M10 7.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z',
        'M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4',
      ],
      onClick: setView('jobs'),
      activeFor: 'jobs',
    },
    { key: 'model', label: t.tbModel, d: ['M3 4h5v4H3zM12 12h5v4h-5z', 'M5.5 8v4h9'], onClick: setView('er'), activeFor: 'er' },
    { key: 'cmp', label: t.tbCompare, d: ['M3 7h9l-2.5-2.5M17 13H8l2.5 2.5'], onClick: setView('compare'), activeFor: 'compare' },
  ]

  return (
    <div
      style={{
        height: 62,
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 8px',
        background: 'var(--pane)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {items.map((it) => {
        const active = it.activeFor === view
        return (
          <div
            key={it.key}
            className="hv-accent-soft"
            onClick={it.onClick}
            style={{
              width: 62,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              margin: '5px 1px',
              borderRadius: 6,
              cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--text2)',
              background: active ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg
                width={21}
                height={21}
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.35}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {it.d.map((p, i) => (
                  <path key={i} d={p} />
                ))}
              </svg>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '.1px', whiteSpace: 'nowrap' }}>{it.label}</div>
          </div>
        )
      })}

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
            color: 'var(--text3)',
            fontSize: 10.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--green)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            {t.connected}
          </div>
          <div style={{ fontFamily: 'var(--mono)' }}>MySQL 8.0.36 · utf8mb4</div>
        </div>
      </div>
    </div>
  )
}
