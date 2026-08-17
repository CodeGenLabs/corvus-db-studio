import { ER } from '../data/schema'

const KEY_COLOR: Record<string, string> = {
  PK: 'var(--amber)',
  FK: 'var(--accent)',
  UQ: 'var(--coral)',
  '': 'transparent',
}

export function ErView() {
  return (
    <div
      style={{
        height: '100%',
        position: 'relative',
        background: 'var(--pane2)',
        backgroundImage: 'radial-gradient(var(--grid-line) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        overflow: 'auto',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={1.4}
        >
          <path d="M250 150 H300 V200 H352" />
          <path d="M614 200 H660 V160 H704" />
          <path d="M829 217 V360" />
          <path d="M250 410 H320 V300 H660 V196 H704" />
        </svg>
      </div>

      {ER.map((e) => (
        <div
          key={e.name}
          style={{
            position: 'absolute',
            left: e.x,
            top: e.y,
            width: e.w,
            background: 'var(--pane)',
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            boxShadow: '0 3px 10px rgba(0,0,0,.10)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '5px 8px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: 11.5,
              fontFamily: 'var(--mono)',
            }}
          >
            {e.name}
          </div>
          {e.fields.map((f) => (
            <div
              key={f[1]}
              style={{
                display: 'grid',
                gridTemplateColumns: '14px 1fr auto',
                gap: 6,
                alignItems: 'center',
                padding: '2px 8px',
                borderTop: '1px solid var(--grid-line)',
                fontSize: 11,
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, color: KEY_COLOR[f[0]], fontFamily: 'var(--mono)' }}>{f[0]}</span>
              <span style={{ fontFamily: 'var(--mono)' }}>{f[1]}</span>
              <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>{f[2]}</span>
            </div>
          ))}
        </div>
      ))}

      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          display: 'flex',
          gap: 4,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          padding: 4,
        }}
      >
        <div
          className="hv-accent"
          style={{ width: 24, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
        >
          −
        </div>
        <div
          style={{ padding: '0 6px', height: 20, display: 'flex', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}
        >
          100%
        </div>
        <div
          className="hv-accent"
          style={{ width: 24, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
        >
          +
        </div>
      </div>
    </div>
  )
}
