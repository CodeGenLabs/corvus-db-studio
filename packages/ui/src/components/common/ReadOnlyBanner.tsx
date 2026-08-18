export interface ReadOnlyBannerProps {
  reason?: string
}

export function ReadOnlyBanner({ reason = 'Kết nối này đang mở ở chế độ CHỈ ĐỌC (Read-Only). Mọi thao tác thay đổi cấu trúc hoặc ghi dữ liệu đã bị vô hiệu hoá.' }: ReadOnlyBannerProps) {
  return (
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'rgba(234, 179, 8, 0.15)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
        color: '#eab308',
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      <span>🔒 <strong>Chỉ Đọc:</strong> {reason}</span>
    </div>
  )
}
