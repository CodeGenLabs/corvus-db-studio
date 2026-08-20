import { useStudio } from '../store/studio'

export function WelcomeView() {
  const { set, t, openTab } = useStudio()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px 16px',
        color: 'var(--text2)',
        textAlign: 'center',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          background: 'var(--pane2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          color: 'var(--accent)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px 0' }}>
        Corvus DB Studio
      </h2>
      <p style={{ maxWidth: 440, fontSize: 12.5, lineHeight: 1.6, margin: '0 0 24px 0', color: 'var(--text3)' }}>
        {t.aboutTagline}
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => set({ showConn: true })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid var(--accent)',
            background: 'var(--accent)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <span>+</span>
          <span>{t.newConnection}</span>
        </button>

        <button
          onClick={() =>
            openTab({
              type: 'tool',
              toolKind: 'sql',
              seq: 1,
            })
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--pane2)',
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          <span>⚡</span>
          <span>{t.tbNewQuery}</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px 24px',
          fontSize: 11,
          color: 'var(--text3)',
          textAlign: 'left',
          maxWidth: 360,
        }}
      >
        <div>
          <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>P</kbd>
          <span style={{ marginLeft: 8 }}>{t.paletteHint}</span>
        </div>
        <div>
          <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>N</kbd>
          <span style={{ marginLeft: 8 }}>{t.tbNewQuery}</span>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  padding: '1px 5px',
  borderRadius: 3,
  border: '1px solid var(--border)',
  background: 'var(--pane2)',
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--text2)',
}
