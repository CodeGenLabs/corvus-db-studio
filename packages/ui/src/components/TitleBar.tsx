import { LANG_LABEL } from '../i18n/dictionaries'
import { useStudio } from '../store/studio'

const WIN_BTN: React.CSSProperties = {
  width: 46,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text2)',
  cursor: 'default',
}

export function TitleBar() {
  const { s, set, tr, cycleLang, toggleTheme } = useStudio()

  const menuItems: [label: string, hint: string, action: (() => void) | null][] = [
    [tr('Tài khoản của tôi', 'My account'), '', null],
    [tr('Quản lý người dùng & quyền', 'Users & privileges'), '⌘U', () => set({ dialog: 'users' })],
    [tr('Cài đặt hệ thống', 'System settings'), '⌘,', () => set({ dialog: 'settings' })],
    [tr('Nhật ký hoạt động', 'Activity log'), '', () => set({ view: 'jobs' })],
    [tr('Đăng xuất', 'Sign out'), '', null],
  ]

  return (
    <div
      style={{
        height: 34,
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--titlebar)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        <div
          style={{
            width: 17,
            height: 17,
            borderRadius: 3,
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          C
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text2)', letterSpacing: '.1px' }}>
          Corvus DB Studio — sakila @ Local Dev
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 8 }}>
        <div
          className="hv-accent-border"
          onClick={cycleLang}
          title="Language"
          style={{
            height: 21,
            padding: '0 9px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text2)',
            cursor: 'pointer',
            background: 'var(--pane)',
          }}
        >
          {LANG_LABEL[s.lang]}
        </div>

        <div
          className="hv-accent-border"
          onClick={toggleTheme}
          title="Theme"
          style={{
            height: 21,
            width: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-strong)',
            borderRadius: 3,
            cursor: 'pointer',
            background: 'var(--pane)',
            color: 'var(--text2)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <circle cx="8" cy="8" r="3.2" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M12.8 3.2l-1.4 1.4M4.6 11.4l-1.4 1.4" />
          </svg>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            onClick={(e) => {
              e.stopPropagation()
              set((prev) => ({ userMenu: !prev.userMenu }))
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9.5,
              fontWeight: 600,
              margin: '0 2px',
              cursor: 'pointer',
              boxShadow: s.userMenu ? '0 0 0 2px var(--accent-soft)' : 'none',
            }}
          >
            TN
          </div>

          {s.userMenu && (
            <div
              className="pop-in"
              style={{
                position: 'absolute',
                top: 28,
                right: 0,
                width: 236,
                background: 'var(--pane)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                boxShadow: 'var(--shadow)',
                padding: 4,
                zIndex: 70,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 9px 10px',
                  borderBottom: '1px solid var(--grid-line)',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    flex: 'none',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  TN
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Tuan Nguyen</div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text3)',
                      fontFamily: 'var(--mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    tuan@archway.co.jp
                  </div>
                </div>
              </div>

              {menuItems.map(([label, hint, action], i) => (
                <div
                  key={label}
                  className="hv-accent-soft"
                  onClick={() => {
                    set({ userMenu: false })
                    action?.()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 26,
                    padding: '0 9px',
                    borderRadius: 5,
                    cursor: 'pointer',
                    fontSize: 11.5,
                    color: i === 4 ? 'var(--red)' : 'var(--text)',
                    marginTop: i === 4 ? 4 : 0,
                    borderTop: i === 4 ? '1px solid var(--grid-line)' : 'none',
                  }}
                >
                  <span>{label}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                    {hint}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div className="hv-row" title="Minimize" style={WIN_BTN}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.1}>
            <path d="M1.5 6h9" />
          </svg>
        </div>
        <div className="hv-row" title="Maximize" style={WIN_BTN}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.1}>
            <rect x="1.8" y="1.8" width="8.4" height="8.4" />
          </svg>
        </div>
        <div className="hv-close" title="Close" style={WIN_BTN}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.1}>
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </div>
      </div>
    </div>
  )
}
