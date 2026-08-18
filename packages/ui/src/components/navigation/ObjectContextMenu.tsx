export interface ObjectContextMenuProps {
  x: number
  y: number
  objectName: string
  objectType: 'table' | 'view' | 'routine' | 'trigger'
  canEdit?: boolean
  canDrop?: boolean
  onClose: () => void
  onOpenData?: () => void
  onDesign?: () => void
  onCopyName?: () => void
  onCopyQuotedName?: () => void
  onExport?: () => void
  onDrop?: () => void
}

export function ObjectContextMenu({
  x,
  y,
  objectName,
  objectType,
  canEdit = true,
  canDrop = true,
  onClose,
  onOpenData,
  onDesign,
  onCopyName,
  onCopyQuotedName,
  onExport,
  onDrop,
}: ObjectContextMenuProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
      />
      <div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          padding: '4px 0',
          zIndex: 9999,
          fontSize: 11.5,
          minWidth: 170,
          color: 'var(--text)',
        }}
      >
        <div style={{ padding: '4px 10px', fontSize: 10.5, color: 'var(--text3)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
          {objectType.toUpperCase()}: {objectName}
        </div>

        {objectType === 'table' && onOpenData && (
          <div
            onClick={() => {
              onOpenData()
              onClose()
            }}
            style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>📊 Mở xem Dữ liệu</span>
          </div>
        )}

        {canEdit && onDesign && (
          <div
            onClick={() => {
              onDesign()
              onClose()
            }}
            style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>✏️ Thiết kế ({objectType})</span>
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

        {onCopyName && (
          <div
            onClick={() => {
              onCopyName()
              onClose()
            }}
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            Sao chép tên
          </div>
        )}

        {onCopyQuotedName && (
          <div
            onClick={() => {
              onCopyQuotedName()
              onClose()
            }}
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            Sao chép tên có Quote
          </div>
        )}

        {onExport && (
          <div
            onClick={() => {
              onExport()
              onClose()
            }}
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            Xuất dữ liệu / DDL…
          </div>
        )}

        {canDrop && onDrop && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div
              onClick={() => {
                onDrop()
                onClose()
              }}
              style={{ padding: '6px 12px', cursor: 'pointer', color: '#ef4444' }}
            >
              🗑️ Xoá (Drop {objectType})…
            </div>
          </>
        )}
      </div>
    </>
  )
}
