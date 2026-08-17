import { useStudio } from '../store/studio'

export function StatusBar() {
  const { s, set, t, tr, navOpen, infoOpen } = useStudio()

  const statusText =
    s.view === 'compare' ? tr('5 khác biệt / 599 dòng', '5 differences / 599 rows') : t.statusSel

  return (
    <div
      style={{
        height: 24,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 10px',
        background: 'var(--titlebar)',
        borderTop: '1px solid var(--border)',
        color: 'var(--text2)',
        fontSize: 11,
      }}
    >
      <span>{statusText}</span>
      <span style={{ color: 'var(--text3)' }}>|</span>
      <span style={{ fontFamily: 'var(--mono)' }}>Local Dev · sakila</span>
      <span style={{ color: 'var(--text3)' }}>|</span>
      <span style={{ fontFamily: 'var(--mono)' }}>{t.latency} 3 ms</span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="hv-accent"
          onClick={() => set((p) => ({ nav: !p.nav }))}
          title={t.navPane}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: navOpen ? 'var(--accent)' : 'var(--text3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round">
            <rect x="1.8" y="3" width="12.4" height="10" rx="1.4" />
            <path d="M6 3v10" />
            <path d="M1.8 3h4.2v10H1.8z" fill="currentColor" stroke="none" opacity=".5" />
          </svg>
        </span>
        <span
          className="hv-accent"
          onClick={() => set((p) => ({ info: !p.info }))}
          title={t.infoPane}
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: infoOpen ? 'var(--accent)' : 'var(--text3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round">
            <rect x="1.8" y="3" width="12.4" height="10" rx="1.4" />
            <path d="M10 3v10" />
            <path d="M10 3h4.2v10H10z" fill="currentColor" stroke="none" opacity=".5" />
          </svg>
        </span>
      </div>
    </div>
  )
}
