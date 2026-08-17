export interface SshFormState {
  enabled: boolean
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
  passphrase?: string
}

interface SshTabProps {
  state: SshFormState
  onChange: (updates: Partial<SshFormState>) => void
}

export function SshTab({ state, onChange }: SshTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        <span>Sử dụng SSH Tunnel (Port Forwarding)</span>
      </label>

      {state.enabled && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>SSH Host</span>
            <input
              type="text"
              value={state.host}
              onChange={(e) => onChange({ host: e.target.value })}
              placeholder="bastion.example.com"
              style={{
                height: 24,
                border: '1px solid var(--border-strong)',
                borderRadius: 5,
                background: 'var(--pane2)',
                color: 'var(--text)',
                padding: '0 8px',
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>SSH Port</span>
            <input
              type="number"
              value={state.port}
              onChange={(e) => onChange({ port: parseInt(e.target.value, 10) || 22 })}
              style={{
                height: 24,
                border: '1px solid var(--border-strong)',
                borderRadius: 5,
                background: 'var(--pane2)',
                color: 'var(--text)',
                padding: '0 8px',
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>SSH Username</span>
            <input
              type="text"
              value={state.username}
              onChange={(e) => onChange({ username: e.target.value })}
              placeholder="ubuntu"
              style={{
                height: 24,
                border: '1px solid var(--border-strong)',
                borderRadius: 5,
                background: 'var(--pane2)',
                color: 'var(--text)',
                padding: '0 8px',
                fontSize: 11.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>Xác thực bằng</span>
            <select
              value={state.authType}
              onChange={(e) => onChange({ authType: e.target.value as 'password' | 'key' })}
              style={{
                height: 24,
                border: '1px solid var(--border-strong)',
                borderRadius: 5,
                background: 'var(--pane2)',
                color: 'var(--text)',
                padding: '0 8px',
                fontSize: 11.5,
              }}
            >
              <option value="key">Private Key</option>
              <option value="password">Password</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
