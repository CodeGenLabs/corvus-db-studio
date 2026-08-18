import { useState } from 'react'
import { Modal } from './Modal'

export interface CopyTableDialogProps {
  sourceTable: string
  sourceDatabase: string
  databases: string[]
  onClose: () => void
  onPreviewCopy: (options: {
    targetDatabase: string
    targetTable: string
    copyStructure: boolean
    copyData: boolean
  }) => void
}

export function CopyTableDialog({
  sourceTable,
  sourceDatabase,
  databases,
  onClose,
  onPreviewCopy,
}: CopyTableDialogProps) {
  const [targetDatabase, setTargetDatabase] = useState(sourceDatabase)
  const [targetTable, setTargetTable] = useState(`${sourceTable}_copy`)
  const [copyStructure, setCopyStructure] = useState(true)
  const [copyData, setCopyData] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetTable.trim()) return
    onPreviewCopy({
      targetDatabase,
      targetTable: targetTable.trim(),
      copyStructure,
      copyData,
    })
  }

  return (
    <Modal onClose={onClose} surface={{ width: 460, height: 340, display: 'flex', flexDirection: 'column' }}>
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
        <span>📋 Sao chép Bảng (Copy Table Structure & Data)</span>
      </div>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Bảng nguồn (Source):</label>
          <input
            disabled
            value={`${sourceDatabase}.${sourceTable}`}
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text3)', fontSize: 11.5 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Database đích:</label>
          <select
            value={targetDatabase}
            onChange={(e) => setTargetDatabase(e.target.value)}
            style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
          >
            {databases.map((db) => (
              <option key={db} value={db}>
                {db}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên bảng đích:</label>
          <input
            autoFocus
            value={targetTable}
            onChange={(e) => setTargetTable(e.target.value)}
            style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={copyStructure}
              onChange={(e) => setCopyStructure(e.target.checked)}
            />
            <span>Sao chép cấu trúc bảng (CREATE TABLE DDL)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={copyData}
              onChange={(e) => setCopyData(e.target.checked)}
            />
            <span>Sao chép toàn bộ dữ liệu (INSERT INTO ... SELECT)</span>
          </label>
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
