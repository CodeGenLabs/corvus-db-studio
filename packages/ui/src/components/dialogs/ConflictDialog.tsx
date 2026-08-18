import { Modal } from './Modal'

export interface ConflictField {
  column: string
  myValue: any
  theirValue: any
  baseValue: any
}

export interface ConflictDialogProps {
  tableName: string
  conflicts: ConflictField[]
  onClose: () => void
  onResolve: (strategy: 'mine' | 'theirs' | 'skip') => void
}

export function ConflictDialog({
  tableName,
  conflicts,
  onClose,
  onResolve,
}: ConflictDialogProps) {
  return (
    <Modal onClose={onClose} surface={{ width: 620, height: 420, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(234, 179, 8, 0.1)',
          color: 'var(--amber)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>⚠️ Phát hiện xung đột dữ liệu (Concurrency Conflict)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
          Dòng dữ liệu trong bảng <strong style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{tableName}</strong> đã bị thay đổi bởi người dùng hoặc tiến trình khác trong khi bạn đang thao tác.
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', padding: '6px 10px', background: 'var(--pane2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
            <div>Cột</div>
            <div>Giá trị ban đầu</div>
            <div style={{ color: 'var(--accent)' }}>Giá trị của bạn (Mine)</div>
            <div style={{ color: 'var(--amber)' }}>Giá trị hiện tại trên DB (Theirs)</div>
          </div>
          {conflicts.map((c) => (
            <div key={c.column} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', padding: '6px 10px', alignItems: 'center', borderBottom: '1px solid var(--grid-line)', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.column}</div>
              <div style={{ color: 'var(--text3)' }}>{String(c.baseValue ?? 'NULL')}</div>
              <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{String(c.myValue ?? 'NULL')}</div>
              <div style={{ color: 'var(--amber)', fontWeight: 600 }}>{String(c.theirValue ?? 'NULL')}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          height: 48,
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
          style={{
            padding: '6px 12px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 4,
            color: 'var(--text)',
            fontSize: 11.5,
            cursor: 'pointer',
          }}
        >
          Huỷ thao tác
        </button>
        <button
          onClick={() => onResolve('theirs')}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--border-strong)',
            background: 'var(--pane)',
            color: 'var(--text)',
            borderRadius: 4,
            fontSize: 11.5,
            cursor: 'pointer',
          }}
        >
          Giữ giá trị DB (Theirs)
        </button>
        <button
          onClick={() => onResolve('mine')}
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
          Ghi đè bằng giá trị của tôi (Mine)
        </button>
      </div>
    </Modal>
  )
}
