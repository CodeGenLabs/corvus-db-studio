import { Modal } from './Modal'

export interface SystemUserWarningModalProps {
  targetUser: string
  actionType: 'modify' | 'drop' | 'revoke'
  isSelf: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SystemUserWarningModal({
  targetUser,
  actionType,
  isSelf,
  onClose,
  onConfirm,
}: SystemUserWarningModalProps) {
  const actionLabel = actionType === 'drop' ? 'Xoá' : actionType === 'revoke' ? 'Tước quyền' : 'Thay đổi cấu hình'

  return (
    <Modal onClose={onClose} surface={{ width: 500, height: 320, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>⚠️ Cảnh báo Bảo mật Cấp cao (High-Risk Action)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5 }}>
          Bạn đang yêu cầu <strong style={{ color: '#ef4444' }}>{actionLabel}</strong> tài khoản{' '}
          <strong style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{targetUser}</strong>.
        </p>

        {isSelf ? (
          <div style={{ padding: 10, borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: 11 }}>
            🚨 <strong>CẢNH BÁO:</strong> Bạn đang thao tác trực tiếp trên <strong>chính tài khoản đang đăng nhập hiện tại</strong>. Thao tác này có thể khiến bạn bị mất quyền truy cập hoặc ngắt kết nối ngay lập tức!
          </div>
        ) : (
          <div style={{ padding: 10, borderRadius: 6, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#eab308', fontSize: 11 }}>
            🛡️ <strong>LƯU Ý:</strong> Đây là <strong>tài khoản quản trị / người dùng hệ thống</strong> (root / postgres / sa). Thay đổi quyền hạn có thể ảnh hưởng đến hoạt động của toàn bộ Database Server.
          </div>
        )}
      </div>

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={onClose}
          style={{ padding: '6px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', fontSize: 11.5, cursor: 'pointer' }}
        >
          Huỷ thao tác
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          style={{ padding: '6px 16px', border: 'none', background: '#ef4444', color: '#ffffff', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Tôi hiểu rủi ro, Tiếp tục ▶
        </button>
      </div>
    </Modal>
  )
}
