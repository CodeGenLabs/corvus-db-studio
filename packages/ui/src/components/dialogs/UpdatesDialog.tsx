import { Modal } from './Modal'
import { useStudio } from '../../store/studio'

export function UpdatesDialog() {
  const { s, set, setCfg, t, tr, startUpdate } = useStudio()
  const close = () => set({ dialog: null })
  const pct = s.updatePct

  const changelog =
    s.lang === 'vi'
      ? [
          'So sánh dữ liệu A ⇄ B: thêm chế độ theo khoá chính và sinh SQL hoàn tác cho MSSQL.',
          'ER Diagram: tự sắp xếp theo khoá ngoại, xuất SVG và PNG.',
          'Trình soạn SQL nhanh hơn 2.4× với script trên 5 000 dòng.',
          'Trợ lý AI đọc được kế hoạch thực thi khi giải thích truy vấn chậm.',
        ]
      : [
          'Compare A ⇄ B: primary-key matching mode and rollback SQL for SQL Server.',
          'ER Diagram: auto-layout from foreign keys, SVG and PNG export.',
          'SQL editor is 2.4× faster on scripts over 5,000 lines.',
          'AI assistant now reads the execution plan when explaining slow queries.',
        ]

  const statusText = s.updating
    ? tr('Đang tải bản 3.3.0…', 'Downloading 3.3.0…')
    : pct >= 100
      ? tr('Đã tải xong, khởi động lại để cài', 'Downloaded — restart to install')
      : tr('Chưa tải', 'Not started')

  const btnLabel =
    pct >= 100 ? tr('Khởi động lại', 'Restart') : s.updating ? tr('Đang tải…', 'Downloading…') : tr('Tải bản mới', 'Download')

  return (
    <Modal onClose={close} surface={{ width: 520 }}>
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontWeight: 600,
        }}
      >
        {t.updates}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
            }}
          >
            ↓
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{t.updateReady}</div>
            <div style={{ color: 'var(--text3)', fontSize: 11.5, fontFamily: 'var(--mono)' }}>3.2.1 → 3.3.0 · 68 MB</div>
          </div>
          <div
            onClick={startUpdate}
            style={{
              marginLeft: 'auto',
              height: 26,
              padding: '0 13px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 600,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              opacity: s.updating ? 0.7 : 1,
            }}
          >
            {btnLabel}
          </div>
        </div>

        <div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--grid-line)', overflow: 'hidden' }}>
            <div
              style={
                s.updating
                  ? { height: '100%', background: 'var(--accent)', animation: 'growBar 4s linear forwards' }
                  : { height: '100%', width: pct + '%', background: 'var(--accent)', transition: 'width .3s ease-out' }
              }
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 5,
              color: 'var(--text3)',
              fontSize: 10.5,
              fontFamily: 'var(--mono)',
            }}
          >
            <span>{statusText}</span>
            <span>{s.updating ? tr('đang tải', 'in progress') : pct + '%'}</span>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              color: 'var(--text3)',
              marginBottom: 6,
            }}
          >
            {t.whatsNew} 3.3.0
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {changelog.map((c) => (
              <div key={c} style={{ display: 'flex', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 5, flex: 'none' }} />
                <span style={{ fontSize: 11.5, color: 'var(--text2)', textWrap: 'pretty' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          height: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <div
          onClick={() => setCfg('autoUpdate', !s.cfg.autoUpdate)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text2)', fontSize: 11.5 }}
        >
          <span
            style={{
              width: 30,
              height: 17,
              borderRadius: 9,
              position: 'relative',
              flex: 'none',
              background: s.cfg.autoUpdate ? 'var(--accent)' : 'var(--border-strong)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: s.cfg.autoUpdate ? 15 : 2,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .15s',
              }}
            />
          </span>
          <span>{t.autoUpdate}</span>
        </div>
        <div
          onClick={close}
          style={{
            marginLeft: 'auto',
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
          {t.later}
        </div>
      </div>
    </Modal>
  )
}
