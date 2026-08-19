import { useState } from 'react'
import { selectValue } from '../../utils/select-value'
import { Modal } from './Modal'

export interface CanvasForeignKeyDialogProps {
  sourceTable: string
  targetTable: string
  sourceColumns: string[]
  targetColumns: string[]
  onClose: () => void
  onPreviewForeignKey: (fk: {
    constraintName: string
    sourceColumn: string
    targetColumn: string
    onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
    onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  }) => void
}

export function CanvasForeignKeyDialog({
  sourceTable,
  targetTable,
  sourceColumns,
  targetColumns,
  onClose,
  onPreviewForeignKey,
}: CanvasForeignKeyDialogProps) {
  const [sourceColumn, setSourceColumn] = useState(sourceColumns[0] || '')
  const [targetColumn, setTargetColumn] = useState(targetColumns[0] || '')
  const [constraintName, setConstraintName] = useState(`fk_${sourceTable}_${targetTable}`)
  const [onDelete, setOnDelete] = useState<'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'>('CASCADE')
  const [onUpdate, setOnUpdate] = useState<'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'>('CASCADE')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceColumn || !targetColumn) return
    onPreviewForeignKey({
      constraintName,
      sourceColumn,
      targetColumn,
      onDelete,
      onUpdate,
    })
  }

  return (
    <Modal onClose={onClose} surface={{ width: 480, height: 380, display: 'flex', flexDirection: 'column' }}>
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
        <span>🔗 Tạo Khóa Ngoại từ ERD Canvas (Foreign Key)</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên ràng buộc (Constraint Name):</label>
          <input
            value={constraintName}
            onChange={(e) => setConstraintName(e.target.value)}
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Cột bảng con ({sourceTable}):</label>
            <select
              value={sourceColumn}
              onChange={(e) => setSourceColumn(e.target.value)}
              style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
            >
              {sourceColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Cột tham chiếu ({targetTable}):</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
            >
              {targetColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Khi Xoá (ON DELETE):</label>
            <select
              value={onDelete}
              onChange={(e) => setOnDelete(selectValue(e.target.value, ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'], 'CASCADE'))}
              style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
            >
              <option value="CASCADE">CASCADE</option>
              <option value="SET NULL">SET NULL</option>
              <option value="RESTRICT">RESTRICT</option>
              <option value="NO ACTION">NO ACTION</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Khi Sửa (ON UPDATE):</label>
            <select
              value={onUpdate}
              onChange={(e) => setOnUpdate(selectValue(e.target.value, ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'], 'CASCADE'))}
              style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
            >
              <option value="CASCADE">CASCADE</option>
              <option value="SET NULL">SET NULL</option>
              <option value="RESTRICT">RESTRICT</option>
              <option value="NO ACTION">NO ACTION</option>
            </select>
          </div>
        </div>
      </form>

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
          Huỷ
        </button>
        <button
          onClick={handleSubmit}
          style={{ padding: '6px 16px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Xem trước SQL (Preview) ▶
        </button>
      </div>
    </Modal>
  )
}
