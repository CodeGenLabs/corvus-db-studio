import { useEffect, useState } from 'react'
import { useStudio, useClient } from '../store/studio'
import type { ConnectionProfile } from '@corvus/contract'

export function WelcomeView() {
  const { set, t, openTab } = useStudio()
  const client = useClient()

  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadRecentConnections() {
      try {
        const list = await client.request<ConnectionProfile[]>('connection.list', {})
        if (!cancelled && Array.isArray(list)) {
          setProfiles(list)
        }
      } catch {
        // ignore
      }
    }
    loadRecentConnections()
    return () => {
      cancelled = true
    }
  }, [client])

  const handleOpenProfile = (p: ConnectionProfile) => {
    set({ selTable: undefined })
    openTab(
      {
        type: 'tool',
        toolKind: 'sql',
        seq: 1,
        connectionId: p.id,
      },
      { title: `Query - ${p.name}` },
    )
  }

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
        overflow: 'auto',
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
          fontSize: 28,
        }}
      >
        🦅
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px 0' }}>
        Corvus DB Studio
      </h2>
      <p style={{ maxWidth: 460, fontSize: 12.5, lineHeight: 1.6, margin: '0 0 20px 0', color: 'var(--text3)' }}>
        {t.aboutTagline}
      </p>

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
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
            color: 'var(--on-accent)',
            cursor: 'pointer',
          }}
        >
          <span>+</span>
          <span>{t.newConnection}</span>
        </button>

        <button
          onClick={() =>
            openTab(
              {
                type: 'tool',
                toolKind: 'sql',
                seq: 1,
              },
              { title: 'SQL Editor' },
            )
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

        <button
          onClick={() =>
            openTab(
              {
                type: 'object',
                connectionId: 'conn-1',
                objectKind: 'table',
                contentKind: 'er',
                name: 'schema_er',
              },
              { title: 'ER Diagram' },
            )
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
          <span>📊</span>
          <span>ER Diagram</span>
        </button>
      </div>

      {/* Recent Connections */}
      {profiles.length > 0 && (
        <div style={{ width: '100%', maxWidth: 520, marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.4px' }}>
            Kết nối gần đây ({profiles.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpenProfile(p)}
                className="hv-row"
                style={{
                  padding: '8px 12px',
                  background: 'var(--pane2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || 'var(--accent)' }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {p.driverId}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--accent)' }}>➔</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Reference */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px 24px',
          fontSize: 11,
          color: 'var(--text3)',
          textAlign: 'left',
          maxWidth: 420,
        }}
      >
        <div>
          <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>K</kbd>
          <span style={{ marginLeft: 8 }}>{t.paletteHint}</span>
        </div>
        <div>
          <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>N</kbd>
          <span style={{ marginLeft: 8 }}>{t.tbNewQuery}</span>
        </div>
        <div>
          <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>,</kbd>
          <span style={{ marginLeft: 8 }}>Cài đặt hệ thống</span>
        </div>
        <div>
          <kbd style={kbdStyle}>F5</kbd>
          <span style={{ marginLeft: 8 }}>Làm mới cây schema</span>
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
