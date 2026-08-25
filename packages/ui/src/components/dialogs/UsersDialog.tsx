import { useState } from 'react'
import { Modal } from './Modal'
import { useStudio, useClient } from '../../store/studio'
import { useActiveContext } from '../../context/useActiveContext'
import { useQuery } from '@tanstack/react-query'

const DEFAULT_USERS: [string, string, string, string, string][] = [
  ['root', 'localhost', 'SUPERADMIN', '2026-08-20', 'active'],
  ['app_user', '%', 'DEVELOPER', '2026-08-21', 'active'],
]

const COLS = '1fr 130px 150px 140px 150px'

const PRIVILEGES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'INDEX',
  'EXECUTE',
  'GRANT OPTION',
]

export function UsersDialog() {
  const { s, set, t, rowH } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const close = () => set({ dialog: null })
  const connectionId = ctx.connectionId || 'conn-1'

  const [activeTab, setActiveTab] = useState<'users' | 'privileges' | 'designer'>('users')
  const [selectedUser, setSelectedUser] = useState(s.userSel || 'app_user')
  const [userPrivs, setUserPrivs] = useState<Record<string, 'granted' | 'none' | 'inherited'>>({
    SELECT: 'granted',
    INSERT: 'granted',
    UPDATE: 'granted',
    DELETE: 'none',
    CREATE: 'none',
    DROP: 'none',
    ALTER: 'none',
    INDEX: 'inherited',
    EXECUTE: 'granted',
    'GRANT OPTION': 'none',
  })

  const { data: _usersList = [] } = useQuery({
    queryKey: ['securityUsers', connectionId],
    queryFn: async () => {
      if (!client || !connectionId) return []
      return (await client.request('security.users', { connectionId })) as Array<{ user: string; host?: string; roles: string[]; status?: string }>
    },
    enabled: !!client && !!connectionId,
  })

  const { data: _rolesList = [] } = useQuery({
    queryKey: ['securityRoles', connectionId],
    queryFn: async () => {
      if (!client || !connectionId) return []
      return (await client.request('security.roles', { connectionId })) as Array<{ role: string; members: string[] }>
    },
    enabled: !!client && !!connectionId,
  })

  const { data: _remotePrivileges = [] } = useQuery({
    queryKey: ['securityPrivileges', connectionId, selectedUser],
    queryFn: async () => {
      if (!client || !connectionId || !selectedUser) return []
      return (await client.request('security.privileges', { connectionId, userOrRole: selectedUser })) as Array<{ object: string; privilege: string; granted: boolean }>
    },
    enabled: !!client && !!connectionId && !!selectedUser,
  })

  const handleApplyGrants = async () => {
    if (!client || !connectionId) return
    try {
      const preview = (await client.request('security.previewGrant', {
        connectionId,
        userOrRole: selectedUser,
        grants: Object.entries(userPrivs).map(([priv, state]) => ({
          object: '*',
          privilege: priv,
          grant: state === 'granted',
        })),
      })) as { previewToken: string; sql: string }

      if (preview?.previewToken) {
        await client.request('security.applyGrant', { previewToken: preview.previewToken })
      }
    } catch {
      // fallback
    }
  }

  const togglePriv = (priv: string) => {
    const current = userPrivs[priv] || 'none'
    const next = current === 'granted' ? 'none' : current === 'none' ? 'inherited' : 'granted'
    setUserPrivs({ ...userPrivs, [priv]: next })
  }

  const targetConnText = [ctx.database, ctx.connectionName ?? ctx.connectionId].filter(Boolean).join(' @ ')

  return (
    <Modal onClose={close} surface={{ width: 760, height: 480, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ fontWeight: 600 }}>{t.usersTitle}</span>
        {targetConnText && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
            {targetConnText}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              height: 24,
              padding: '0 10px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === 'users' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'users' ? 'var(--accent)' : 'var(--text2)',
              fontWeight: activeTab === 'users' ? 600 : 400,
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            Người dùng ({DEFAULT_USERS.length})
          </button>
          <button
            onClick={() => setActiveTab('privileges')}
            style={{
              height: 24,
              padding: '0 10px',
              borderRadius: 4,
              border: 'none',
              background: activeTab === 'privileges' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'privileges' ? 'var(--accent)' : 'var(--text2)',
              fontWeight: activeTab === 'privileges' ? 600 : 400,
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            Ma trận quyền (Privilege Matrix)
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              height: 24,
              flex: 'none',
              alignItems: 'center',
              background: 'var(--pane2)',
              borderBottom: '1px solid var(--border)',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.3px',
              textTransform: 'uppercase',
              color: 'var(--text3)',
            }}
          >
            <div style={{ padding: '0 10px' }}>{t.usersUser}</div>
            <div style={{ padding: '0 10px' }}>{t.usersHost}</div>
            <div style={{ padding: '0 10px' }}>{t.usersRole}</div>
            <div style={{ padding: '0 10px' }}>{t.usersLast}</div>
            <div style={{ padding: '0 10px' }}>{t.usersState}</div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {DEFAULT_USERS.map((u, i) => {
              const color = u[4] === 'active' ? 'var(--green)' : u[4] === 'locked' ? 'var(--amber)' : 'var(--red)'
              return (
                <div
                  key={u[0]}
                  className="hv-row"
                  onClick={() => {
                    setSelectedUser(u[0])
                    set({ userSel: u[0] })
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    height: rowH + 5,
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--grid-line)',
                    background: selectedUser === u[0] ? 'var(--accent-soft)' : i % 2 ? 'var(--row-alt)' : 'transparent',
                  }}
                >
                  <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        flex: 'none',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 600,
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                      }}
                    >
                      {u[0].slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>{u[0]}</span>
                  </div>
                  <div style={{ padding: '0 10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{u[1]}</div>
                  <div style={{ padding: '0 10px', color: 'var(--text2)' }}>{u[2]}</div>
                  <div style={{ padding: '0 10px', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{u[3]}</div>
                  <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 17,
                        padding: '0 7px',
                        borderRadius: 9,
                        fontSize: 10,
                        fontWeight: 600,
                        color,
                        border: '1px solid ' + color + '55',
                      }}
                    >
                      {u[4]}
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUser(u[0])
                        setActiveTab('privileges')
                      }}
                      style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}
                    >
                      {t.usersEdit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'privileges' && (
        <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Đang cấu hình quyền cho user:</span>
            <strong style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)' }}>{selectedUser}</strong>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 180px', padding: '6px 12px', background: 'var(--pane2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
              <div>Đặc quyền (Privilege)</div>
              <div>Trạng thái</div>
              <div>Ghi chú</div>
            </div>

            {PRIVILEGES.map((p) => {
              const state = userPrivs[p] || 'none'
              const color = state === 'granted' ? 'var(--green)' : state === 'inherited' ? 'var(--accent)' : 'var(--text3)'
              const label = state === 'granted' ? '✔ Đã cấp (Granted)' : state === 'inherited' ? '⇪ Thừa hưởng (Inherited)' : '✖ Không cấp'
              return (
                <div
                  key={p}
                  className="hv-row"
                  onClick={() => togglePriv(p)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 180px',
                    padding: '8px 12px',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--grid-line)',
                    cursor: 'pointer',
                    fontSize: 11.5,
                  }}
                >
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)' }}>{p}</div>
                  <div>
                    <span style={{ color, fontWeight: 600, fontSize: 11 }}>{label}</span>
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 10.5 }}>Nhấp để chuyển trạng thái</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{t.usersHint}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {activeTab === 'privileges' && (
            <div
              onClick={handleApplyGrants}
              style={{
                height: 26,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lưu quyền
            </div>
          )}
          <div
            onClick={close}
            style={{
              height: 26,
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              borderRadius: 5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.close}
          </div>
        </div>
      </div>
    </Modal>
  )
}
