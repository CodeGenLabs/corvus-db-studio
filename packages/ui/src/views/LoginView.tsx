import { useState } from 'react'

export interface LoginViewProps {
  onLoginSuccess?: (token: string) => void
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
      return
    }
    setLoading(true)
    setError(null)

    // Simulate login verification
    setTimeout(() => {
      setLoading(false)
      if (onLoginSuccess) {
        onLoginSuccess('dummy_jwt_token_auth')
      }
    }, 600)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 360,
          padding: 28,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🦅</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            Corvus DB Studio
          </h2>
          <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 4 }}>
            Đăng nhập tài khoản làm việc
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 5, fontSize: 11 }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
              Tên đăng nhập:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                padding: '0 10px',
                background: 'var(--pane2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
              Mật khẩu:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                height: 32,
                padding: '0 10px',
                background: 'var(--pane2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                color: 'var(--text)',
                fontSize: 12,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 34,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 5,
              fontWeight: 600,
              fontSize: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 6,
            }}
          >
            {loading ? 'Đang xác thực…' : 'Đăng nhập'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>HOẶC</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button
            type="button"
            style={{
              height: 32,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text)',
              borderRadius: 5,
              fontSize: 11.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>🔑</span>
            <span>Đăng nhập qua OIDC / SSO</span>
          </button>
        </form>
      </div>
    </div>
  )
}
