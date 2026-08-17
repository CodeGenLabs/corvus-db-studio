import { useState } from 'react'
import { Modal } from './Modal'
import { DB_ICON, dbMark } from '../../data/icons'
import { useStudio, useClient } from '../../store/studio'
import { SslTab, type SslFormState } from './connection/SslTab'
import { SshTab, type SshFormState } from './connection/SshTab'
import { AdvancedTab, type AdvancedFormState } from './connection/AdvancedTab'
import { TestConnectionResult, type TestResultData } from './connection/TestConnectionResult'

const KINDS = ['MySQL / MariaDB', 'PostgreSQL', 'SQL Server', 'Oracle', 'SQLite', 'MongoDB', 'Redis']
type DialogTab = 'general' | 'ssl' | 'ssh' | 'advanced'

interface Preset {
  name: string
  host: string
  port: string
  user: string
  db: string
  dbLabel: string
}

export function ConnectionDialog() {
  const { s, set, t, tr } = useStudio()
  const client = useClient()
  const close = () => set({ showConn: false })
  const activeKind = s.connKind

  const [activeTab, setActiveTab] = useState<DialogTab>('general')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResultData | null>(null)

  const [sslState, setSslState] = useState<SslFormState>({
    enabled: false,
    mode: 'require',
    caCert: '',
    clientCert: '',
    clientKey: '',
  })

  const [sshState, setSshState] = useState<SshFormState>({
    enabled: false,
    host: '',
    port: 22,
    username: '',
    authType: 'key',
  })

  const [advancedState, setAdvancedState] = useState<AdvancedFormState>({
    readOnly: false,
    color: '#4a9eff',
    group: '',
    initialDatabase: '',
    queryTimeoutSec: 30,
  })

  const presets: Record<string, Preset> = {
    'MySQL / MariaDB': { name: 'Staging MySQL', host: '10.4.12.31', port: '3306', user: 'corvus_app', db: 'sakila', dbLabel: tr('Database mặc định', 'Default database') },
    PostgreSQL: { name: 'Analytics PG', host: 'pg.analytics.internal', port: '5432', user: 'corvus_ro', db: 'public', dbLabel: tr('Database / schema', 'Database / schema') },
    'SQL Server': { name: 'Reporting DW', host: 'mssql-dw-01', port: '1433', user: 'sa', db: 'dw', dbLabel: tr('Database mặc định', 'Default database') },
    Oracle: { name: 'Legacy ERP', host: 'erp-oracle.corp', port: '1521', user: 'ERP_APP', db: 'ERPPROD', dbLabel: 'Service name / SID' },
    SQLite: { name: 'Mobile cache', host: '~/data/mobile.sqlite', port: '—', user: '—', db: 'main', dbLabel: tr('Tệp cơ sở dữ liệu', 'Database file') },
    MongoDB: { name: 'Events cluster', host: 'mongo-0.events.svc', port: '27017', user: 'events_rw', db: 'events', dbLabel: tr('Bộ sưu tập mặc định', 'Default database') },
    Redis: { name: 'Session cache', host: 'redis.cache.svc', port: '6379', user: 'default', db: 'db0', dbLabel: tr('Chỉ số DB', 'Database index') },
  }

  const p = presets[activeKind] ?? presets['PostgreSQL']!
  const isSqlite = activeKind === 'SQLite'

  const [formData, setFormData] = useState({
    name: p.name,
    host: p.host,
    port: p.port,
    user: p.user,
    password: '',
    db: p.db,
  })

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      if (client) {
        const res = (await client.request('connection.test', {
          name: formData.name,
          driverId: isSqlite ? 'sqlite' : activeKind.toLowerCase().includes('mysql') ? 'mysql' : 'postgres',
          host: formData.host,
          port: parseInt(formData.port, 10) || undefined,
          user: formData.user,
          password: formData.password,
          database: formData.db,
        })) as TestResultData
        setTestResult(res)
      } else {
        await new Promise((r) => setTimeout(r, 600))
        setTestResult({ ok: true, version: `${activeKind} 16.2`, latencyMs: 12 })
      }
    } catch (err) {
      setTestResult({ ok: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal onClose={close} surface={{ width: 620 }} zIndex={20}>
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontWeight: 600,
        }}
      >
        <span>{t.newConnection}</span>
        <span
          style={{
            height: 18,
            padding: '0 8px',
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 9,
            fontSize: 10.5,
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
          }}
        >
          {activeKind}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['general', 'ssl', 'ssh', 'advanced'] as DialogTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                height: 22,
                padding: '0 8px',
                borderRadius: 4,
                border: 'none',
                background: activeTab === tab ? 'var(--pane)' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text3)',
                fontSize: 11,
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 280 }}>
        <div style={{ width: 150, flex: 'none', borderRight: '1px solid var(--border)', padding: '8px 0', background: 'var(--pane2)' }}>
          {KINDS.map((k) => {
            const on = activeKind === k
            const mark = dbMark(k.split(' /')[0]) ?? DB_ICON.MySQL
            return (
              <div
                key={k}
                className="hv-pane"
                onClick={() => {
                  set({ connKind: k })
                  const nextP = presets[k]
                  if (nextP) {
                    setFormData({
                      name: nextP.name,
                      host: nextP.host,
                      port: nextP.port,
                      user: nextP.user,
                      password: '',
                      db: nextP.db,
                    })
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 26,
                  padding: '0 12px',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  background: on ? 'var(--pane)' : 'transparent',
                  color: on ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: 'none', stroke: mark[1] }}
                >
                  <path d={mark[0]} />
                </svg>
                <span>{k}</span>
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1 }}>
          {activeTab === 'general' && (
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{tr('Tên kết nối', 'Connection name')}</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: isSqlite ? 'span 2' : 'auto' }}>
                <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{isSqlite ? tr('Đường dẫn tệp', 'File path') : 'Host'}</span>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
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

              {!isSqlite && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>Port</span>
                  <input
                    type="text"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
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
              )}

              {!isSqlite && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{tr('Người dùng', 'User')}</span>
                    <input
                      type="text"
                      value={formData.user}
                      onChange={(e) => setFormData({ ...formData, user: e.target.value })}
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
                    <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{tr('Mật khẩu', 'Password')}</span>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
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
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{p.dbLabel}</span>
                <input
                  type="text"
                  value={formData.db}
                  onChange={(e) => setFormData({ ...formData, db: e.target.value })}
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
            </div>
          )}

          {activeTab === 'ssl' && (
            <SslTab state={sslState} onChange={(u) => setSslState({ ...sslState, ...u })} />
          )}

          {activeTab === 'ssh' && (
            <SshTab state={sshState} onChange={(u) => setSshState({ ...sshState, ...u })} />
          )}

          {activeTab === 'advanced' && (
            <AdvancedTab state={advancedState} onChange={(u) => setAdvancedState({ ...advancedState, ...u })} />
          )}
        </div>
      </div>

      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="hv-accent-border"
          style={{
            height: 26,
            padding: '0 11px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            borderRadius: 5,
            background: 'transparent',
            color: 'var(--text2)',
            cursor: testing ? 'not-allowed' : 'pointer',
            fontSize: 11.5,
          }}
        >
          {testing ? 'Testing...' : t.testConnection}
        </button>

        <TestConnectionResult loading={testing} result={testResult} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={close}
            style={{
              height: 26,
              padding: '0 11px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-strong)',
              borderRadius: 5,
              background: 'transparent',
              color: 'var(--text2)',
              cursor: 'pointer',
              fontSize: 11.5,
            }}
          >
            {t.cancel}
          </button>
          <button
            onClick={close}
            style={{
              height: 26,
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 5,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 11.5,
            }}
          >
            {t.save}
          </button>
        </div>
      </div>
    </Modal>
  )
}
