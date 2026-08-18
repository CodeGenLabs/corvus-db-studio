import { useState } from 'react'
import { useStudio } from '../store/studio'

interface FormColumn {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
}

export function FormView() {
  const { s } = useStudio()
  const tableName = s.selTable || 'customer'
  const columns: FormColumn[] = [
    { name: 'customer_id', type: 'INT', nullable: false, isPrimaryKey: true },
    { name: 'first_name', type: 'VARCHAR', nullable: false, isPrimaryKey: false },
    { name: 'last_name', type: 'VARCHAR', nullable: false, isPrimaryKey: false },
    { name: 'email', type: 'VARCHAR', nullable: true, isPrimaryKey: false },
    { name: 'active', type: 'BOOLEAN', nullable: false, isPrimaryKey: false },
    { name: 'create_date', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false },
  ]

  const [currentRecordIndex, setCurrentRecordIndex] = useState(0)
  const totalRecords = 50

  const [formData, setFormData] = useState<Record<string, any>>({
    customer_id: 1,
    first_name: 'MARY',
    last_name: 'SMITH',
    email: 'MARY.SMITH@sakilacustomer.org',
    active: 1,
    create_date: '2026-08-18 09:00:00',
  })

  const handleChange = (colName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [colName]: value }))
  }

  const handlePrev = () => {
    if (currentRecordIndex > 0) {
      setCurrentRecordIndex((prev) => prev - 1)
      setFormData((prev) => ({ ...prev, customer_id: currentRecordIndex }))
    }
  }

  const handleNext = () => {
    if (currentRecordIndex < totalRecords - 1) {
      setCurrentRecordIndex((prev) => prev + 1)
      setFormData((prev) => ({ ...prev, customer_id: currentRecordIndex + 2 }))
    }
  }

  const handleNew = () => {
    setCurrentRecordIndex(totalRecords)
    const empty: Record<string, any> = {}
    columns.forEach((c: FormColumn) => {
      empty[c.name] = c.isPrimaryKey ? totalRecords + 1 : ''
    })
    setFormData(empty)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Form Navigation Bar */}
      <div
        style={{
          height: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          📋 Xem dạng Biểu mẫu (Form View) - Bảng <strong style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{tableName}</strong>
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handlePrev}
            disabled={currentRecordIndex === 0}
            style={{
              height: 22,
              padding: '0 8px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              borderRadius: 3,
              color: 'var(--text)',
              cursor: currentRecordIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentRecordIndex === 0 ? 0.4 : 1,
            }}
          >
            ◀ Trước
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
            {currentRecordIndex + 1} / {totalRecords}
          </span>
          <button
            onClick={handleNext}
            disabled={currentRecordIndex >= totalRecords - 1}
            style={{
              height: 22,
              padding: '0 8px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              borderRadius: 3,
              color: 'var(--text)',
              cursor: currentRecordIndex >= totalRecords - 1 ? 'not-allowed' : 'pointer',
              opacity: currentRecordIndex >= totalRecords - 1 ? 0.4 : 1,
            }}
          >
            Sau ▶
          </button>

          <button
            onClick={handleNew}
            style={{
              height: 22,
              padding: '0 8px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 3,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            + Thêm bản ghi mới
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div style={{ flex: 1, padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {columns.map((col: FormColumn) => (
            <div key={col.name} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 11.5 }}>{col.name}</span>
                {col.isPrimaryKey && <span style={{ fontSize: 10, color: 'var(--accent)' }}>🔑</span>}
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>({col.type})</span>
              </div>
              <input
                value={formData[col.name] ?? ''}
                onChange={(e) => handleChange(col.name, e.target.value)}
                disabled={col.isPrimaryKey && currentRecordIndex < totalRecords}
                style={{
                  height: 28,
                  padding: '0 8px',
                  background: 'var(--pane2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 4,
                  color: 'var(--text)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11.5,
                  opacity: col.isPrimaryKey && currentRecordIndex < totalRecords ? 0.7 : 1,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
