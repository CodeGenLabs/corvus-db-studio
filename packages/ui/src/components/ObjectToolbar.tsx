import { SearchIcon } from './SearchIcon'
import { useStudio } from '../store/studio'
import type { CSSProperties } from 'react'

const BASE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 22,
  flex: 'none',
  whiteSpace: 'nowrap',
  padding: '0 9px',
  borderRadius: 5,
  cursor: 'pointer',
  color: 'var(--text2)',
  fontSize: 11.5,
}

export function ObjectToolbar() {
  const { s, set, t, setView } = useStudio()
  const view = s.view

  const tools = [
    { label: t.openTable, c: 'var(--accent)', onClick: setView('data') },
    { label: t.designTable, c: 'var(--amber)', onClick: setView('design') },
    { label: t.newTable, c: 'var(--green)', onClick: setView('design'), listOnly: true },
    {
      label: t.flButton,
      c: 'var(--accent)',
      onClick: () => set((p) => ({ showFilter: !p.showFilter })),
      active: s.showFilter,
    },
  ].filter((o) => !(o.listOnly && view !== 'objects'))

  return (
    <div
      style={{
        height: 32,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '0 8px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {tools.map((o) => (
        <div
          key={o.label}
          className="hv-accent-soft"
          onClick={o.onClick}
          style={
            o.active
              ? { ...BASE, background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }
              : BASE
          }
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: o.c }} />
          <span>{o.label}</span>
        </div>
      ))}

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 22,
          padding: '0 8px',
          border: '1px solid var(--border)',
          borderRadius: 5,
          color: 'var(--text3)',
          background: 'var(--pane2)',
          width: 190,
        }}
      >
        <SearchIcon />
        <span style={{ fontSize: 11 }}>{t.searchObjects}</span>
      </div>
    </div>
  )
}
