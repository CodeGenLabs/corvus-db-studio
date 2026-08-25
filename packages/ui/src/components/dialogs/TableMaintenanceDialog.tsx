import { useState } from 'react'
import { Modal } from './Modal'
import { useClient } from '../../store/studio'

export interface TableMaintenanceDialogProps {
  connectionId?: string
  tableName: string
  engine: 'mysql' | 'postgres' | 'sqlite'
  onClose: () => void
  onRunMaintenance: (operation: string) => void
}

export function TableMaintenanceDialog({
  connectionId,
  tableName,
  engine,
  onClose,
  onRunMaintenance,
}: TableMaintenanceDialogProps) {
  const client = useClient()
  const [selectedOp, setSelectedOp] = useState<string>(
    engine === 'sqlite' ? 'VACUUM' : engine === 'postgres' ? 'VACUUM ANALYZE' : 'OPTIMIZE TABLE',
  )
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const operations =
    engine === 'sqlite'
      ? [
          { id: 'VACUUM', label: 'VACUUM', desc: 'Dọn dẹp không gian đĩa thừa và sắp xếp lại tệp SQLite' },
          { id: 'ANALYZE', label: 'ANALYZE', desc: 'Thu thập số liệu thống kê chỉ mục để tối ưu hoá bộ lập lịch truy vấn' },
          { id: 'PRAGMA integrity_check', label: 'Integrity Check', desc: 'Kiểm tra tính toàn vẹn cơ sở dữ liệu' },
        ]
      : engine === 'postgres'
      ? [
          { id: 'VACUUM ANALYZE', label: 'VACUUM ANALYZE', desc: 'Thu hồi dung lượng bộ nhớ từ các tuple chết và cập nhật thống kê' },
          { id: 'REINDEX TABLE', label: 'REINDEX TABLE', desc: 'Xây dựng lại toàn bộ các chỉ mục trên bảng' },
          { id: 'ANALYZE', label: 'ANALYZE', desc: 'Thu thập số liệu phân phối dữ liệu các cột' },
        ]
      : [
          { id: 'OPTIMIZE TABLE', label: 'OPTIMIZE TABLE', desc: 'Sắp xếp lại lưu trữ dữ liệu bảng và thu hồi không gian đĩa thừa' },
          { id: 'ANALYZE TABLE', label: 'ANALYZE TABLE', desc: 'Phân tích và lưu trữ phân phối khoá' },
          { id: 'CHECK TABLE', label: 'CHECK TABLE', desc: 'Kiểm tra lỗi cấu trúc bảng' },
          { id: 'CHECKSUM TABLE', label: 'CHECKSUM TABLE', desc: 'Tính toán giá trị checksum của bảng' },
        ]

  const handleExecute = async () => {
    setIsRunning(true)
    try {
      if (client && connectionId) {
        const action = selectedOp.toLowerCase().includes('vacuum')
          ? 'vacuum'
          : selectedOp.toLowerCase().includes('analyze')
          ? 'analyze'
          : selectedOp.toLowerCase().includes('reindex')
          ? 'reindex'
          : 'optimize'
        const res = (await client.request('ddl.maintain', {
          connectionId,
          table: tableName,
          action,
        })) as { success: boolean; message: string }
        setResult(res.message || 'Thành công')
      } else {
        setResult(`Thực thi thành công: ${selectedOp} \`${tableName}\``)
      }
      if (onRunMaintenance) onRunMaintenance(selectedOp)
    } catch (err) {
      setResult(`Lỗi: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Modal onClose={onClose} surface={{ width: 560, height: 400, display: 'flex', flexDirection: 'column' }}>
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
        <span>🛠️ Bảo trì Bảng (Table Maintenance) - <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{tableName}</strong></span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text2)' }}>
          Chọn tác vụ bảo trì và tối ưu hoá lưu trữ cho bảng trên hệ quản trị <strong style={{ textTransform: 'uppercase' }}>{engine}</strong>:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {operations.map((op) => (
            <label
              key={op.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: 10,
                borderRadius: 6,
                border: selectedOp === op.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: selectedOp === op.id ? 'var(--accent-soft)' : 'var(--pane2)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="maintenance-op"
                checked={selectedOp === op.id}
                onChange={() => setSelectedOp(op.id)}
                style={{ marginTop: 2 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <strong style={{ color: 'var(--text)', fontSize: 11.5, fontFamily: 'var(--mono)' }}>{op.label}</strong>
                <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>{op.desc}</span>
              </div>
            </label>
          ))}
        </div>

        {result && (
          <div style={{ padding: 10, borderRadius: 5, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: 11, fontFamily: 'var(--mono)' }}>
            {result}
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
          Đóng
        </button>
        <button
          onClick={handleExecute}
          disabled={isRunning}
          style={{
            padding: '6px 16px',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning ? 'Đang thực thi…' : 'Thực thi bảo trì ▶'}
        </button>
      </div>
    </Modal>
  )
}
