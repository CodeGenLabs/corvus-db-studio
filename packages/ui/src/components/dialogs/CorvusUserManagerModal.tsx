import { useState } from 'react'
import { selectValue } from '../../utils/select-value'
import { Modal } from './Modal'

export interface CorvusUser {
  id: string
  username: string
  role: 'admin' | 'developer' | 'analyst' | 'viewer'
  isActive: boolean
  createdAt: string
}

export interface CorvusUserManagerModalProps {
  onClose: () => void
  initialUsers?: CorvusUser[]
  onSaveUser: (user: Partial<CorvusUser>) => void
  onDeleteUser: (userId: string) => void
}

const DEFAULT_USERS: CorvusUser[] = [
  { id: '1', username: 'admin', role: 'admin', isActive: true, createdAt: '2026-01-01' },
  { id: '2', username: 'developer_team', role: 'developer', isActive: true, createdAt: '2026-02-15' },
  { id: '3', username: 'bi_analyst', role: 'analyst', isActive: true, createdAt: '2026-03-10' },
]

export function CorvusUserManagerModal({
  onClose,
  initialUsers = DEFAULT_USERS,
  onSaveUser,
  onDeleteUser,
}: CorvusUserManagerModalProps) {
  const [users, setUsers] = useState<CorvusUser[]>(initialUsers)
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<CorvusUser['role']>('developer')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) return
    const newUser: CorvusUser = {
      id: String(Date.now()),
      username: newUsername.trim(),
      role: newRole,
      isActive: true,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    setUsers([...users, newUser])
    onSaveUser(newUser)
    setNewUsername('')
  }

  const handleDelete = (id: string) => {
    setUsers(users.filter((u) => u.id !== id))
    onDeleteUser(id)
  }

  return (
    <Modal onClose={onClose} surface={{ width: 620, height: 440, display: 'flex', flexDirection: 'column' }}>
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
        <span>👥 Quản trị Người dùng Hệ thống (Corvus User Management)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="Tên tài khoản mới…"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            style={{ flex: 1, height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(selectValue(e.target.value, ['admin', 'developer', 'analyst', 'viewer'], 'developer'))}
            style={{ width: 130, height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
          >
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="developer">Lập trình viên (Developer)</option>
            <option value="analyst">Phân tích (Analyst)</option>
            <option value="viewer">Chỉ xem (Viewer)</option>
          </select>
          <button
            type="submit"
            style={{ padding: '0 12px', height: 26, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
          >
            + Thêm người dùng
          </button>
        </form>

        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, overflow: 'auto', background: 'var(--pane)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--pane2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Tài khoản</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Vai trò</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Trạng thái</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Ngày tạo</th>
                <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text2)', width: 60 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', color: 'var(--text)', fontWeight: 500 }}>{u.username}</td>
                  <td style={{ padding: '6px 10px', color: 'var(--accent)', textTransform: 'capitalize' }}>{u.role}</td>
                  <td style={{ padding: '6px 10px', color: u.isActive ? '#10b981' : '#ef4444' }}>
                    {u.isActive ? '● Hoạt động' : '○ Đã khoá'}
                  </td>
                  <td style={{ padding: '6px 10px', color: 'var(--text3)' }}>{u.createdAt}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                      >
                        Xoá
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          height: 42,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={onClose}
          style={{ padding: '5px 14px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', fontSize: 11.5, cursor: 'pointer' }}
        >
          Đóng
        </button>
      </div>
    </Modal>
  )
}
