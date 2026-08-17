import { Modal } from './Modal'
import { useStudio } from '../../store/studio'

export function AboutDialog() {
  const { set, t, tr } = useStudio()
  const close = () => set({ dialog: null })

  const facts: [string, string][] = [
    [tr('Bản dựng', 'Build'), '20260812.3'],
    [tr('Giấy phép', 'License'), tr('Doanh nghiệp · 25 chỗ', 'Enterprise · 25 seats')],
    [tr('Đăng ký cho', 'Registered to'), 'Archway Co., Ltd.'],
    ['Driver bundle', '9 · MySQL, PG, MSSQL, Oracle…'],
    ['Electron / Chromium', '31.4 / 126'],
  ]

  return (
    <Modal onClose={close} surface={{ width: 420 }}>
      <div
        style={{
          padding: '26px 24px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          C
        </div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Corvus DB Studio</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text2)' }}>Version 3.2.1 (build 20260812)</div>
        <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 11.5, maxWidth: 300, textWrap: 'pretty' }}>
          {t.aboutTagline}
        </div>
      </div>

      <div style={{ padding: '12px 24px' }}>
        {facts.map(([label, value]) => (
          <div
            key={label}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderBottom: '1px solid var(--grid-line)' }}
          >
            <span style={{ color: 'var(--text3)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--mono)' }}>{value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          height: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <a href="#" style={{ fontSize: 11.5 }}>
          {t.releaseNotes}
        </a>
        <a href="#" style={{ fontSize: 11.5 }}>
          {t.licenses}
        </a>
        <div
          onClick={close}
          style={{
            marginLeft: 'auto',
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
    </Modal>
  )
}
