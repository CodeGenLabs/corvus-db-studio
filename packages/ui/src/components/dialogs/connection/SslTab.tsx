export interface SslFormState {
  enabled: boolean
  mode: 'disable' | 'require' | 'verify-ca' | 'verify-full'
  caCert: string
  clientCert: string
  clientKey: string
}

interface SslTabProps {
  state: SslFormState
  onChange: (updates: Partial<SslFormState>) => void
}

export function SslTab({ state, onChange }: SslTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        <span>Bật kết nối bảo mật SSL / TLS</span>
      </label>

      {state.enabled && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>SSL Mode</span>
            <select
              value={state.mode}
              onChange={(e) => onChange({ mode: e.target.value as SslFormState['mode'] })}
              style={{
                height: 26,
                border: '1px solid var(--border-strong)',
                borderRadius: 5,
                background: 'var(--pane2)',
                color: 'var(--text)',
                padding: '0 8px',
                fontSize: 11.5,
              }}
            >
              <option value="require">Require (Encrypted)</option>
              <option value="verify-ca">Verify CA (Check Certificate Authority)</option>
              <option value="verify-full">Verify Full (Check CA & Hostname)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>CA Certificate Path (.pem, .crt)</span>
            <input
              type="text"
              value={state.caCert}
              onChange={(e) => onChange({ caCert: e.target.value })}
              placeholder="/path/to/ca.pem"
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
        </>
      )}
    </div>
  )
}
