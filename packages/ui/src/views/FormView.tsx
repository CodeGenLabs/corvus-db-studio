import { useState, useEffect } from 'react'
import { useStudio, useClient } from '../store/studio'
import type { TableMeta, CellValue } from '@corvus/contract'

interface FormColumn {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
}

type FormFieldValue = string | number | boolean | null

export function FormView() {
  const { s, activeTab } = useStudio()
  const client = useClient()

  const tab = activeTab()
  const objIdent = tab?.identity.type === 'object' ? tab.identity : null
  const connectionId = objIdent?.connectionId || 'conn-1'
  const tableName = objIdent?.name || s.selTable || 'customer'
  const database = objIdent?.database
  const schema = objIdent?.namespace

  const [columns, setColumns] = useState<FormColumn[]>([
    { name: 'customer_id', type: 'INT', nullable: false, isPrimaryKey: true },
    { name: 'first_name', type: 'VARCHAR', nullable: false, isPrimaryKey: false },
    { name: 'last_name', type: 'VARCHAR', nullable: false, isPrimaryKey: false },
    { name: 'email', type: 'VARCHAR', nullable: true, isPrimaryKey: false },
    { name: 'active', type: 'BOOLEAN', nullable: false, isPrimaryKey: false },
    { name: 'create_date', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false },
  ])

  const [currentRecordIndex, setCurrentRecordIndex] = useState(0)
  const [totalRecords, setTotalRecords] = useState(1)
  const [formData, setFormData] = useState<Record<string, FormFieldValue>>({
    customer_id: 1,
    first_name: 'MARY',
    last_name: 'SMITH',
    email: 'MARY.SMITH@sakilacustomer.org',
    active: 1,
    create_date: '2026-08-18 09:00:00',
  })
  const [originalData, setOriginalData] = useState<Record<string, FormFieldValue>>({})

  // Modal preview change
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewSql, setPreviewSql] = useState('')
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 1. Tải metadata cột từ introspect.tableMeta
  useEffect(() => {
    let cancelled = false
    async function loadMeta() {
      if (!tableName) return
      try {
        const meta = await client.request<TableMeta>('introspect.tableMeta', {
          connectionId,
          database,
          schema,
          table: tableName,
        })
        if (!cancelled && meta && meta.columns && meta.columns.length > 0) {
          setColumns(
            meta.columns.map((c) => ({
              name: c.name,
              type: (c.dataType || 'VARCHAR').toUpperCase(),
              nullable: c.nullable,
              isPrimaryKey: c.isPrimaryKey,
            })),
          )
        }
      } catch {
        // Fallback default
      }
    }
    loadMeta()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, database, schema, tableName])

  // 2. Tải tổng số dòng
  useEffect(() => {
    let cancelled = false
    async function loadCount() {
      if (!tableName) return
      try {
        const res = await client.request<{ count: number }>('data.count', {
          connectionId,
          database,
          schema,
          table: tableName,
        })
        if (!cancelled && res && res.count > 0) {
          setTotalRecords(res.count)
        }
      } catch {
        // Fallback default
      }
    }
    loadCount()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, database, schema, tableName])

  // 3. Tải dòng dữ liệu tại vị trí currentRecordIndex
  useEffect(() => {
    let cancelled = false
    async function loadRecord() {
      if (!tableName) return
      try {
        const stream = client.stream('data.browse', {
          connectionId,
          database,
          schema,
          table: tableName,
          page: currentRecordIndex + 1,
          pageSize: 1,
        })

        for await (const rawChunk of stream) {
          if (cancelled) break
          const chunk = rawChunk as {
            columns?: Array<{ name: string; type: string }>
            rows?: CellValue[][]
          }
          if (chunk.rows && chunk.rows.length > 0) {
            const row = chunk.rows[0]
            if (!row) continue
            const record: Record<string, FormFieldValue> = {}
            columns.forEach((c, idx) => {
              const cell = row[idx]
              if (!cell || cell.k === 'null' || cell.k === 'missing') {
                record[c.name] = null
              } else if ('v' in cell) {
                record[c.name] = cell.v as FormFieldValue
              } else {
                record[c.name] = null
              }
            })
            setFormData(record)
            setOriginalData(record)
            break
          }
        }
      } catch {
        // Fallback
      }
    }
    loadRecord()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, database, schema, tableName, currentRecordIndex, columns])

  const handleChange = (colName: string, value: FormFieldValue) => {
    setFormData((prev) => ({ ...prev, [colName]: value }))
  }

  const handlePrev = () => {
    if (currentRecordIndex > 0) {
      setCurrentRecordIndex((prev) => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentRecordIndex < totalRecords - 1) {
      setCurrentRecordIndex((prev) => prev + 1)
    }
  }

  const handleNew = () => {
    setCurrentRecordIndex(totalRecords)
    const empty: Record<string, FormFieldValue> = {}
    columns.forEach((c: FormColumn) => {
      empty[c.name] = c.isPrimaryKey ? totalRecords + 1 : ''
    })
    setFormData(empty)
    setOriginalData({})
  }

  const handleSave = async () => {
    // Generate changes diff
    const updates: Array<{ rowPk: Record<string, unknown>; column: string; oldValue: unknown; newValue: unknown }> = []
    const pkCol = columns.find((c) => c.isPrimaryKey) || columns[0]
    if (!pkCol) return

    const pkVal = originalData[pkCol.name] ?? formData[pkCol.name]
    const rowPk = { [pkCol.name]: pkVal }

    for (const c of columns) {
      if (formData[c.name] !== originalData[c.name]) {
        updates.push({
          rowPk,
          column: c.name,
          oldValue: originalData[c.name],
          newValue: formData[c.name],
        })
      }
    }

    if (updates.length === 0) {
      alert('Không có thay đổi nào để lưu.')
      return
    }

    try {
      const res = await client.request<{ sql: string; previewToken: string }>('data.previewChanges', {
        connectionId,
        database,
        schema,
        table: tableName,
        changes: updates,
      })
      setPreviewSql(res.sql)
      setPreviewToken(res.previewToken)
      setShowPreviewModal(true)
    } catch (err) {
      alert(`Lỗi sinh preview: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleApplyChanges = async () => {
    if (!previewToken) return
    setSaving(true)
    try {
      await client.request('data.applyChanges', { previewToken })
      alert('Đã lưu bản ghi thành công!')
      setOriginalData({ ...formData })
      setShowPreviewModal(false)
    } catch (err) {
      alert(`Lỗi lưu bản ghi: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSaving(false)
    }
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
            {Math.min(currentRecordIndex + 1, totalRecords)} / {totalRecords}
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
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              color: 'var(--text)',
              borderRadius: 3,
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            + Bản ghi mới
          </button>

          <button
            onClick={handleSave}
            style={{
              height: 22,
              padding: '0 10px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 3,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            💾 Lưu bản ghi
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
                value={formData[col.name] == null ? '' : String(formData[col.name])}
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

      {/* Preview Diff Modal */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: 520,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text)' }}>
              Xác nhận thay đổi dữ liệu
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--text2)' }}>
              Câu lệnh SQL sau sẽ được áp dụng trên cơ sở dữ liệu:
            </p>
            <pre
              style={{
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 10,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                color: 'var(--text)',
                lineHeight: 1.5,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {previewSql}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text)', borderRadius: 4, cursor: 'pointer', fontSize: 11.5 }}
              >
                Huỷ
              </button>
              <button
                disabled={saving}
                onClick={handleApplyChanges}
                style={{ padding: '6px 14px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 11.5 }}
              >
                {saving ? 'Đang lưu...' : 'Xác nhận áp dụng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
