import { useState } from 'react'
import { Modal } from './Modal'

export interface RoleDesignerModalProps {
  onClose: () => void
  onSave: (roleData: { roleName: string; canLogin: boolean; inheritRoles: string[] }) => void
}

export function RoleDesignerModal({ onClose, onSave }: RoleDesignerModalProps) {
  const [roleName, setRoleName] = useState('')
  const [canLogin, setCanLogin] = useState(false)
  const [inheritRoles, setInheritRoles] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) return
    const rolesList = inheritRoles
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
    onSave({ roleName: roleName.trim(), canLogin, inheritRoles: rolesList })
    onClose()
  }

  return (
    <Modal onClose={onClose} surface={{ width: 480, height: 320, display: 'flex', flexDirection: 'column' }}>
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
        <span>🛡️ Tạo/Sửa Vai trò (Role Designer)</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên vai trò (Role Name):</label>
          <input
            autoFocus
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g. read_only_role"
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text)', cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={canLogin}
              onChange={(e) => setCanLogin(e.target.checked)}
            />
            <span>Cho phép đăng nhập trực tiếp (CAN LOGIN)</span>
          </label>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Kế thừa các vai trò khác (cách nhau bởi dấu phẩy):</label>
          <input
            value={inheritRoles}
            onChange={(e) => setInheritRoles(e.target.value)}
            placeholder="e.g. reader, reporter"
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
          Lưu vai trò
        </button>
      </div>
    </Modal>
  )
}
