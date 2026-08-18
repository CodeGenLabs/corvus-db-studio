import { useState } from 'react'
import { Modal } from './Modal'

export interface UserDesignerModalProps {
  onClose: () => void
  onSave: (userData: { username: string; host: string; authPlugin: string; password?: string }) => void
}

export function UserDesignerModal({ onClose, onSave }: UserDesignerModalProps) {
  const [username, setUsername] = useState('')
  const [host, setHost] = useState('%')
  const [authPlugin, setAuthPlugin] = useState('caching_sha2_password')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    onSave({ username: username.trim(), host, authPlugin, password: password || undefined })
    onClose()
  }

  return (
    <Modal onClose={onClose} surface={{ width: 480, height: 360, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        <span>👤 Tạo/Sửa Người dùng Cơ sở Dữ liệu (User Designer)</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên tài khoản (Username):</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. app_user"
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Host cho phép:</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="% hoặc localhost hoặc IP"
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Cơ chế xác thực (Authentication):</label>
          <select
            value={authPlugin}
            onChange={(e) => setAuthPlugin(e.target.value)}
            style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
          >
            <option value="caching_sha2_password">caching_sha2_password (Mặc định)</option>
            <option value="mysql_native_password">mysql_native_password</option>
            <option value="scram-sha-256">SCRAM-SHA-256 (PostgreSQL)</option>
            <option value="md5">MD5</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Để trống nếu không đổi"
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
        </div>
      </form>

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={onClose}
          style={{ padding: '6px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', fontSize: 11.5, cursor: 'pointer' }}
        >
          Huỷ
        </button>
        <button
          onClick={handleSubmit}
          style={{ padding: '6px 16px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Lưu người dùng
        </button>
      </div>
    </Modal>
  )
}
