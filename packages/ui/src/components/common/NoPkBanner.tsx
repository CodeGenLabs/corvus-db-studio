export interface NoPkBannerProps {
  tableName: string
}

export function NoPkBanner({ tableName }: NoPkBannerProps) {
  return (
    <div
      style={{
        height: 26,
        background: 'rgba(234, 179, 8, 0.15)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
        color: 'var(--amber)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        fontSize: 11,
      }}
    >
      <span>⚠️</span>
      <span>
        Bảng <strong style={{ fontFamily: 'var(--mono)' }}>{tableName}</strong> không có Khoá chính (Primary Key). Dữ liệu chỉ có thể xem ở chế độ chỉ đọc (Read-only), không cho phép sửa trực tiếp trên ô.
      </span>
    </div>
  )
}
