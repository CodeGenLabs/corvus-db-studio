import type { CSSProperties } from 'react'

const BANNER_STYLE: CSSProperties = {
  width: '100%',
  backgroundColor: '#d97706', // amber-600
  color: '#ffffff',
  padding: '6px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  fontWeight: 600,
  zIndex: 9999,
  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  letterSpacing: '0.3px',
}

const BADGE_STYLE: CSSProperties = {
  backgroundColor: '#b45309',
  padding: '2px 8px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  fontSize: '10.5px',
  letterSpacing: '0.5px',
  marginRight: '8px',
}

const HINT_STYLE: CSSProperties = {
  fontFamily: 'var(--mono, monospace)',
  backgroundColor: 'rgba(0,0,0,0.2)',
  padding: '2px 6px',
  borderRadius: '3px',
  fontWeight: 'normal',
}

export function MockModeBanner() {
  return (
    <div data-testid="mock-mode-banner" style={BANNER_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={BADGE_STYLE}>Mock Mode</span>
        <span>MÔI TRƯỜNG DỮ LIỆU GIẢ LẬP — KHÔNG KẾT NỐI DATABASE THẬT</span>
      </div>
      <div style={{ fontSize: '11px', opacity: 0.95 }}>
        Để kết nối database thật: chạy <span style={HINT_STYLE}>pnpm dev:db</span> rồi mở lại app
      </div>
    </div>
  )
}
