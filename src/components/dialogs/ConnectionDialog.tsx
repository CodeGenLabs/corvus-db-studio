import { Modal } from './Modal'
import { DB_ICON, dbMark } from '../../data/icons'
import { useStudio } from '../../store/studio'

const KINDS = ['MySQL / MariaDB', 'PostgreSQL', 'SQL Server', 'Oracle', 'SQLite', 'MongoDB', 'Redis']

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
  const close = () => set({ showConn: false })
  const activeKind = s.connKind

  const presets: Record<string, Preset> = {
    'MySQL / MariaDB': { name: 'Staging MySQL', host: '10.4.12.31', port: '3306', user: 'corvus_app', db: 'sakila', dbLabel: tr('Database mặc định', 'Default database') },
    PostgreSQL: { name: 'Analytics PG', host: 'pg.analytics.internal', port: '5432', user: 'corvus_ro', db: 'public', dbLabel: tr('Database / schema', 'Database / schema') },
    'SQL Server': { name: 'Reporting DW', host: 'mssql-dw-01', port: '1433', user: 'sa', db: 'dw', dbLabel: tr('Database mặc định', 'Default database') },
    Oracle: { name: 'Legacy ERP', host: 'erp-oracle.corp', port: '1521', user: 'ERP_APP', db: 'ERPPROD', dbLabel: 'Service name / SID' },
    SQLite: { name: 'Mobile cache', host: '~/data/mobile.sqlite', port: '—', user: '—', db: 'main', dbLabel: tr('Tệp cơ sở dữ liệu', 'Database file') },
    MongoDB: { name: 'Events cluster', host: 'mongo-0.events.svc', port: '27017', user: 'events_rw', db: 'events', dbLabel: tr('Bộ sưu tập mặc định', 'Default database') },
    Redis: { name: 'Session cache', host: 'redis.cache.svc', port: '6379', user: 'default', db: 'db0', dbLabel: tr('Chỉ số DB', 'Database index') },
  }

  const p = presets[activeKind]
  const isSqlite = activeKind === 'SQLite'

  const fields: [label: string, value: string, wide: boolean][] = (
    [
      [tr('Tên kết nối', 'Connection name'), p.name, true],
      [isSqlite ? tr('Đường dẫn tệp', 'File path') : 'Host', p.host, isSqlite],
      ['Port', p.port, false],
      [tr('Người dùng', 'User'), p.user, false],
      [tr('Mật khẩu', 'Password'), isSqlite ? '—' : '••••••••••', false],
      [p.dbLabel, p.db, true],
    ] as [string, string, boolean][]
  ).filter((f) => !(isSqlite && (f[0] === 'Port' || f[1] === '—')))

  return (
    <Modal onClose={close} surface={{ width: 560 }} zIndex={20}>
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
      </div>

      <div style={{ display: 'flex' }}>
        <div style={{ width: 150, flex: 'none', borderRight: '1px solid var(--border)', padding: '8px 0', background: 'var(--pane2)' }}>
          {KINDS.map((k) => {
            const on = activeKind === k
            const mark = dbMark(k.split(' /')[0]) ?? DB_ICON.MySQL
            return (
              <div
                key={k}
                className="hv-pane"
                onClick={() => set({ connKind: k })}
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

        <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
          {fields.map(([label, value, wide]) => (
            <div
              key={label}
              style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: wide ? 'span 2' : 'auto' }}
            >
              <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{label}</span>
              <span
                style={{
                  height: 24,
                  border: '1px solid var(--border-strong)',
                  borderRadius: 5,
                  background: 'var(--pane2)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                }}
              >
                {value}
              </span>
            </div>
          ))}
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', fontSize: 11 }}>
            <span style={{ width: 26, height: 15, borderRadius: 8, background: 'var(--accent)', position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  right: 2,
                  top: 2,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: 'var(--on-accent)',
                }}
              />
            </span>
            <span>{t.useSsl}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          height: 46,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <div
          className="hv-accent-border"
          style={{
            height: 26,
            padding: '0 11px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            borderRadius: 5,
            color: 'var(--text2)',
            cursor: 'pointer',
          }}
        >
          {t.testConnection}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div
            onClick={close}
            style={{
              height: 26,
              padding: '0 11px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-strong)',
              borderRadius: 5,
              color: 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            {t.cancel}
          </div>
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
            {t.save}
          </div>
        </div>
      </div>
    </Modal>
  )
}
