import { JOBS } from '../data/schema'
import { useStudio } from '../store/studio'

const PILL_COLOR: Record<string, string> = {
  ok: 'var(--green)',
  running: 'var(--accent)',
  warn: 'var(--amber)',
  fail: 'var(--red)',
}

const CAPTION: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 6,
}

export function JobsView() {
  const { t, tr, rowH } = useStudio()

  const cards = [
    { label: tr('Dung lượng sao lưu 7 ngày', 'Backup size, 7 days'), value: '18.4 GB', note: tr('6 job · 41 lần chạy', '6 jobs · 41 runs') },
    { label: tr('Thời gian trung bình', 'Average duration'), value: '4m 12s', note: tr('Chậm nhất: Analytics ETL', 'Slowest: Analytics ETL') },
    { label: tr('Tỉ lệ thành công', 'Success rate'), value: '96%', note: tr('1 lỗi trong 7 ngày', '1 failure in 7 days') },
  ]

  return (
    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={CAPTION}>{t.backups}</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {JOBS.map((j, i) => (
            <div
              key={j[0]}
              className="hv-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 170px 100px',
                height: rowH + 6,
                alignItems: 'center',
                borderBottom: i === JOBS.length - 1 ? 'none' : '1px solid var(--grid-line)',
                background: 'var(--pane)',
              }}
            >
              <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: PILL_COLOR[j[4]], flex: 'none' }} />
                <span style={{ fontWeight: 500 }}>{j[0]}</span>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{j[1]}</span>
              </div>
              <div style={{ padding: '0 10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{j[2]}</div>
              <div style={{ padding: '0 10px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>{j[3]}</div>
              <div style={{ padding: '0 10px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 18,
                    padding: '0 8px',
                    borderRadius: 9,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: PILL_COLOR[j[4]],
                    border: '1px solid ' + PILL_COLOR[j[4]],
                  }}
                >
                  {j[4]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={CAPTION}>{t.recentRuns}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {cards.map((c) => (
            <div
              key={c.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '10px 12px',
                background: 'var(--pane2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)' }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{c.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
