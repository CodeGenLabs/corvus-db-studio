import { BK_FILES } from '../data/schema'
import { useStudio } from '../store/studio'
import type { BackupOptions, BackupScope } from '../types'

const BK_COLS = '1fr 150px 90px 110px 190px'
const PILL_COLOR: Record<string, string> = {
  ok: 'var(--green)',
  warn: 'var(--amber)',
  fail: 'var(--red)',
  running: 'var(--accent)',
}

export function BackupView() {
  const { s, set, t, tr, rowH, runBackup } = useStudio()

  const scopes: [BackupScope, string, string][] = [
    ['full', tr('Toàn bộ database', 'Entire database'), '15 tables · 7 views · 3 functions'],
    ['tables', tr('Chọn bảng cụ thể', 'Selected tables'), tr('Đang chọn: country, city, address', 'Selected: country, city, address')],
    ['schema', tr('Chỉ cấu trúc (schema)', 'Structure only'), tr('DDL, không kèm dữ liệu', 'DDL without row data')],
  ]

  const options: [keyof BackupOptions, string][] = [
    ['compress', tr('Nén gzip', 'Gzip compression')],
    ['routines', tr('Kèm routine và trigger', 'Include routines and triggers')],
    ['dataOnly', tr('Chỉ dữ liệu, bỏ DDL', 'Data only, skip DDL')],
    ['verify', tr('Kiểm tra tệp sau khi tạo', 'Verify file after write')],
  ]

  const cards: [string, string, string][] = [
    [tr('Bản mới nhất', 'Latest backup'), '7h', tr('Toàn bộ · 3.1 GB · gzip', 'Full · 3.1 GB · gzip')],
    [tr('Đích lưu', 'Destination'), '62%', tr('D:\\backups · còn 340 GB', 'D:\\backups · 340 GB free')],
    [tr('Khôi phục gần nhất', 'Last restore'), '2026-08-05', tr('staging @ Analytics · 6m 04s', 'staging @ Analytics · 6m 04s')],
  ]

  const status = s.bkRunning
    ? tr('Đang ghi sakila_20260812_1042.sql.gz…', 'Writing sakila_20260812_1042.sql.gz…')
    : s.bkPct >= 100
      ? tr('Hoàn tất · đã kiểm tra tệp', 'Complete · file verified')
      : tr('Chưa chạy', 'Idle')

  const runLabel = s.bkRunning
    ? tr('Đang sao lưu…', 'Backing up…')
    : s.bkPct >= 100
      ? tr('Sao lưu lại', 'Run again')
      : tr('Sao lưu ngay', 'Run backup now')

  const sectionLabel: React.CSSProperties = {
    fontSize: 10.5,
    color: 'var(--text3)',
    textTransform: 'uppercase',
    letterSpacing: '.4px',
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div
        style={{
          width: 320,
          flex: 'none',
          borderRight: '1px solid var(--border)',
          background: 'var(--pane2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 28,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}
        >
          {t.bkNew}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={sectionLabel}>{t.bkTarget}</span>
            <div
              style={{
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 9px',
                background: 'var(--pane)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
              }}
            >
              <span>sakila @ Local Dev</span>
              <span style={{ color: 'var(--text3)' }}>▾</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={sectionLabel}>{t.bkScope}</span>
            {scopes.map(([key, label, note]) => {
              const on = s.bkScope === key
              return (
                <div
                  key={key}
                  className="hv-border-accent"
                  onClick={() => set({ bkScope: key })}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '7px 9px',
                    borderRadius: 5,
                    cursor: 'pointer',
                    fontSize: 11.5,
                    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                    background: on ? 'var(--accent-soft)' : 'var(--pane)',
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      flex: 'none',
                      marginTop: 2,
                      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--accent)' : 'transparent' }} />
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>{note}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={sectionLabel}>{t.bkOptions}</span>
            {options.map(([key, label]) => {
              const on = s.bkOpt[key]
              return (
                <div
                  key={key}
                  onClick={() => set((p) => ({ bkOpt: { ...p.bkOpt, [key]: !p.bkOpt[key] } }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      flex: 'none',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                      background: on ? 'var(--accent)' : 'transparent',
                      color: on ? 'var(--on-accent)' : 'transparent',
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text2)' }}>{label}</span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={sectionLabel}>{t.bkDest}</span>
            <div
              style={{
                height: 26,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 9px',
                background: 'var(--pane)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--text2)',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {'D:\\backups\\sakila'}
              </span>
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>…</span>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 'none',
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            onClick={runBackup}
            style={{
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 600,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              opacity: s.bkRunning ? 0.7 : 1,
            }}
          >
            {runLabel}
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'var(--grid-line)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: s.bkPct + '%',
                background: s.bkPct >= 100 ? 'var(--green)' : 'var(--accent)',
                transition: 'width .25s linear',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            <span>{status}</span>
            <span>{s.bkPct}%</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            height: 28,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '.5px',
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}
        >
          <span>{t.bkHistory}</span>
          <span style={{ fontFamily: 'var(--mono)', textTransform: 'none', letterSpacing: 0, color: 'var(--text3)' }}>
            6 · 18.4 GB
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: BK_COLS,
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
          <div style={{ padding: '0 10px' }}>{t.bkFile}</div>
          <div style={{ padding: '0 10px' }}>{t.bkWhen}</div>
          <div style={{ padding: '0 10px' }}>{t.bkSize}</div>
          <div style={{ padding: '0 10px' }}>{t.bkKind}</div>
          <div style={{ padding: '0 10px' }}>{t.bkState}</div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {BK_FILES.map((b, i) => {
            const failed = b[4] === 'fail'
            return (
              <div
                key={b[0]}
                className="hv-row"
                onClick={() => set({ bkSel: b[0] })}
                style={{
                  display: 'grid',
                  gridTemplateColumns: BK_COLS,
                  height: rowH + 5,
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--grid-line)',
                  background: s.bkSel === b[0] ? 'var(--accent-soft)' : i % 2 ? 'var(--row-alt)' : 'transparent',
                }}
              >
                <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    strokeWidth={1.3}
                    strokeLinejoin="round"
                    style={{ flex: 'none', stroke: failed ? 'var(--red)' : 'var(--text3)' }}
                  >
                    <path d="M4.2 2.5h4.6l3.2 3.2v8.1H4.2z M8.8 2.5v3.2h3.2" />
                  </svg>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b[0]}
                  </span>
                </div>
                <div style={{ padding: '0 10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{b[1]}</div>
                <div style={{ padding: '0 10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'right' }}>{b[2]}</div>
                <div style={{ padding: '0 10px', color: 'var(--text2)' }}>{b[3]}</div>
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
                      color: PILL_COLOR[b[4]],
                      border: '1px solid ' + PILL_COLOR[b[4]] + '55',
                    }}
                  >
                    {b[4]}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: failed ? 'var(--text3)' : 'var(--accent)',
                      cursor: failed ? 'default' : 'pointer',
                      opacity: failed ? 0.5 : 1,
                    }}
                  >
                    {t.bkRestore}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            flex: 'none',
            borderTop: '1px solid var(--border)',
            padding: '10px 12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            background: 'var(--pane2)',
          }}
        >
          {cards.map(([label, value, note]) => (
            <div
              key={label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 11px',
                background: 'var(--pane)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 600, fontFamily: 'var(--mono)' }}>{value}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text2)' }}>{note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
