import { Modal } from './Modal'

export interface ShortcutCheatsheetModalProps {
  onClose: () => void
}

export function ShortcutCheatsheetModal({ onClose }: ShortcutCheatsheetModalProps) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
  const mod = isMac ? '⌘' : 'Ctrl'

  const shortcuts = [
    { section: 'SQL Editor', items: [
      { key: `${mod} + Enter`, desc: 'Thực thi toàn bộ câu lệnh hoặc câu lệnh tại con trỏ' },
      { key: `${mod} + ⇧ + Enter`, desc: 'Thực thi đoạn mã đang được bôi đen' },
      { key: `${mod} + ⇧ + F`, desc: 'Định dạng câu lệnh SQL (Format SQL)' },
      { key: `${mod} + E`, desc: 'Xem kế hoạch thực thi truy vấn (Explain Plan)' },
      { key: `${mod} + F`, desc: 'Tìm kiếm & Thay thế (Find & Replace)' },
      { key: `${mod} + Space`, desc: 'Gợi ý từ khoá và đoạn mã mẫu (Snippets)' },
      { key: 'Esc', desc: 'Huỷ câu lệnh đang thực thi (Stop query)' },
    ]},
    { section: 'Dữ liệu & Lưới (Data Grid)', items: [
      { key: `${mod} + C`, desc: 'Sao chép dữ liệu ô đang chọn' },
      { key: `${mod} + ⇧ + C`, desc: 'Sao chép nâng cao (TSV, JSON, Markdown, INSERT SQL)' },
      { key: 'Enter / F2', desc: 'Bắt đầu sửa trực tiếp giá trị trên ô' },
      { key: `${mod} + S`, desc: 'Lưu các thay đổi dữ liệu bảng (Apply changes)' },
      { key: `${mod} + Z`, desc: 'Huỷ bỏ các chỉnh sửa chưa lưu' },
    ]},
    { section: 'Điều hướng hệ thống (Navigation)', items: [
      { key: `${mod} + K`, desc: 'Mở Bảng lệnh thông minh (Command Palette)' },
      { key: `${mod} + T`, desc: 'Mở Tab truy vấn mới' },
      { key: `${mod} + W`, desc: 'Đóng Tab hiện tại' },
      { key: `${mod} + 1..7`, desc: 'Chuyển nhanh giữa các View chính' },
    ]},
  ]

  return (
    <Modal onClose={onClose} surface={{ width: 620, height: 480, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        <span>⌨️ Bảng phím tắt bàn phím (Keyboard Shortcuts)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {shortcuts.map((group) => (
          <div key={group.section} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {group.section}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
              {group.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    borderBottom: idx === group.items.length - 1 ? 'none' : '1px solid var(--grid-line)',
                    fontSize: 11.5,
                  }}
                >
                  <span style={{ color: 'var(--text)' }}>{item.desc}</span>
                  <kbd
                    style={{
                      padding: '2px 6px',
                      background: 'var(--pane2)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 4,
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      color: 'var(--text2)',
                      fontWeight: 600,
                    }}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: '6px 16px',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Đóng
        </button>
      </div>
    </Modal>
  )
}
