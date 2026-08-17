import { SearchIcon } from '../SearchIcon'
import { useStudio } from '../../store/studio'

export function CommandPalette() {
  const { set, t, tr, setView } = useStudio()
  const close = () => set({ showPalette: false })

  const items: [label: string, hint: string, action: () => void][] = [
    [tr('Mở bảng country', 'Open table country'), 'sakila', setView('data')],
    [tr('So sánh dữ liệu A ⇄ B', 'Compare data A ⇄ B'), '⌘⇧C', setView('compare')],
    [tr('Truy vấn mới', 'New query'), '⌘N', setView('sql')],
    ['ER Diagram', '⌘E', setView('er')],
    [tr('Thiết kế bảng country', 'Design table country'), '⌘D', setView('design')],
    [tr('Kết nối mới…', 'New connection…'), '⌘⇧N', () => set({ showPalette: false, showConn: true })],
  ]

  return (
    <div
      onClick={close}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(12,14,15,.42)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 120,
        zIndex: 30,
      }}
    >
      <div
        className="pop-in"
        style={{
          width: 520,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--border)' }}>
          <SearchIcon size={13} stroke="var(--text3)" />
          <span style={{ color: 'var(--text3)' }}>{t.paletteHint}</span>
        </div>
        {items.map(([label, hint, action]) => (
          <div
            key={label}
            className="hv-pane2"
            onClick={action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 30,
              padding: '0 12px',
              cursor: 'pointer',
              borderTop: '1px solid var(--grid-line)',
              fontSize: 11.5,
            }}
          >
            <span>{label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>{hint}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
