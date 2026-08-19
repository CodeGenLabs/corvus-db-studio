import type { CellValue } from '@corvus/contract'

export interface CellContextMenuProps {
  x: number
  y: number
  cellValue: CellValue
  columnName: string
  onClose: () => void
  onSetNull: () => void
  onSetEmptyString: () => void
  onFilterEquals: () => void
  onFilterNotEquals: () => void
  onCopyValue: () => void
  onOpenCellEditor: () => void
}

export function CellContextMenu({
  x,
  y,
  cellValue,
  columnName,
  onClose,
  onSetNull,
  onSetEmptyString,
  onFilterEquals,
  onFilterNotEquals,
  onCopyValue,
  onOpenCellEditor,
}: CellContextMenuProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: Math.min(x, window.innerWidth - 200),
          top: Math.min(y, window.innerHeight - 260),
          width: 200,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 6,
          boxShadow: 'var(--shadow)',
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column',
          fontSize: 11.5,
          color: 'var(--text)',
        }}
      >
        <div
          onClick={() => {
            onOpenCellEditor()
            onClose()
          }}
          className="hv-row"
          style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>📝</span>
          <span>Mở trình sửa ô lớn…</span>
        </div>

        <div
          onClick={() => {
            onCopyValue()
            onClose()
          }}
          className="hv-row"
          style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>📋</span>
          <span>Sao chép giá trị</span>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

        <div
          onClick={() => {
            onSetNull()
            onClose()
          }}
          className="hv-row"
          style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>∅</span>
          <span>Đặt giá trị thành NULL</span>
        </div>

        <div
          onClick={() => {
            onSetEmptyString()
            onClose()
          }}
          className="hv-row"
          style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>""</span>
          <span>Đặt giá trị thành chuỗi rỗng</span>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

        <div
          onClick={() => {
            onFilterEquals()
            onClose()
          }}
          className="hv-row"
          style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🔍</span>
          <span>Lọc: {columnName} = {String(cellValue ?? 'NULL').slice(0, 10)}</span>
        </div>

        <div
          onClick={() => {
            onFilterNotEquals()
            onClose()
          }}
          className="hv-row"
          style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>≠</span>
          <span>Lọc: {columnName} ≠ {String(cellValue ?? 'NULL').slice(0, 10)}</span>
        </div>
      </div>
    </div>
  )
}
