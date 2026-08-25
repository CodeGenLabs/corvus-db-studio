import { useEffect, useState } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { generateCreateTable } from '@corvus/sql'
import type { FieldDesign, IndexDesign, ForeignKeyDesign, TableDesign, TableMeta } from '@corvus/contract'

const COLS = '30px 1fr 140px 80px 100px 60px 60px 1fr'

export function DesignView() {
  const { activeTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()

  const tab = activeTab()
  const objIdent = tab?.identity.type === 'object' ? tab.identity : null

  const connectionId = objIdent?.connectionId || ctx.connectionId || ''
  const table = objIdent?.name || ctx.selection.primaryTarget || ''
  const schema = objIdent?.namespace
  const database = objIdent?.database

  const [activeSubTab, setActiveSubTab] = useState<'fields' | 'indexes' | 'foreignKeys' | 'ddl'>('fields')
  const [fields, setFields] = useState<FieldDesign[]>([
    { id: 'f-1', name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, autoIncrement: true },
    { id: 'f-2', name: 'name', type: 'VARCHAR', length: '50', nullable: false, isPrimaryKey: false },
    { id: 'f-3', name: 'created_at', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ])

  const [indexes, setIndexes] = useState<IndexDesign[]>([
    { id: 'idx-1', name: 'idx_name', columns: ['name'], unique: false, type: 'BTREE' },
  ])

  const [foreignKeys, setForeignKeys] = useState<ForeignKeyDesign[]>([])

  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewSql, setPreviewSql] = useState('')
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // 1. Tải cấu trúc bảng thật từ introspect.tableMeta
  useEffect(() => {
    let cancelled = false
    async function fetchTableMeta() {
      if (!table) return
      try {
        const meta = await client.request<TableMeta>('introspect.tableMeta', {
          connectionId,
          database,
          schema,
          table,
        })
        if (!cancelled && meta && meta.columns && meta.columns.length > 0) {
          setFields(
            meta.columns.map((c, i) => ({
              id: `f-${i + 1}`,
              name: c.name,
              type: (c.dataType || 'VARCHAR').toUpperCase(),
              nullable: c.nullable,
              isPrimaryKey: c.isPrimaryKey,
              defaultValue: c.defaultValue ?? undefined,
              comment: c.comment,
            })),
          )
          if (meta.foreignKeys) {
            setForeignKeys(
              meta.foreignKeys.map((fk, i) => ({
                id: `fk-${i + 1}`,
                name: fk.name || `fk_${i + 1}`,
                column: fk.column,
                referencedTable: fk.referencedTable,
                referencedColumn: fk.referencedColumn,
                onDelete: fk.onDelete?.toUpperCase() as ForeignKeyDesign['onDelete'],
                onUpdate: fk.onUpdate?.toUpperCase() as ForeignKeyDesign['onUpdate'],
              })),
            )
          }
        }
      } catch {
        // Fallback default
      }
    }
    fetchTableMeta()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, database, schema, table])

  const handleAddField = () => {
    const newField: FieldDesign = {
      id: `f-${Date.now()}`,
      name: `column_${fields.length + 1}`,
      type: 'VARCHAR',
      length: '255',
      nullable: true,
      isPrimaryKey: false,
    }
    setFields([...fields, newField])
  }

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id))
  }

  const handleUpdateField = (id: string, updates: Partial<FieldDesign>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const handleAddIndex = () => {
    const newIdx: IndexDesign = {
      id: `idx-${Date.now()}`,
      name: `idx_${fields[0]?.name || 'col'}`,
      columns: [fields[0]?.name || 'id'],
      unique: false,
      type: 'BTREE',
    }
    setIndexes([...indexes, newIdx])
  }

  const handleAddForeignKey = () => {
    const newFk: ForeignKeyDesign = {
      id: `fk-${Date.now()}`,
      name: `fk_${table}_ref`,
      column: fields[0]?.name || 'id',
      referencedTable: 'other_table',
      referencedColumn: 'id',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }
    setForeignKeys([...foreignKeys, newFk])
  }

  const tableDesign: TableDesign = {
    name: table,
    fields,
    indexes,
    foreignKeys,
  }

  const generated = generateCreateTable(tableDesign, 'postgres')

  const handleOpenPreview = async () => {
    try {
      const res = await client.request<{ sql: string; previewToken: string }>('ddl.previewTable', {
        connectionId,
        database,
        schema,
        design: tableDesign,
      })
      setPreviewSql(res.sql)
      setPreviewToken(res.previewToken)
      setShowPreviewModal(true)
    } catch {
      setPreviewSql(generated.statements.join('\n'))
      setPreviewToken(null)
      setShowPreviewModal(true)
    }
  }

  const handleApplyDdl = async () => {
    if (!previewToken) {
      alert('Không có preview token để áp dụng DDL')
      return
    }
    setApplying(true)
    try {
      await client.request('ddl.applyTable', { previewToken })
      alert('Đã áp dụng DDL thành công!')
      setShowPreviewModal(false)
    } catch (err) {
      alert(`Lỗi áp dụng DDL: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
        }}
      >
        {activeSubTab === 'fields' && (
          <button
            onClick={handleAddField}
            style={{
              height: 22,
              padding: '0 8px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Thêm cột
          </button>
        )}

        {activeSubTab === 'indexes' && (
          <button
            onClick={handleAddIndex}
            style={{
              height: 22,
              padding: '0 8px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Thêm chỉ mục (Index)
          </button>
        )}

        {activeSubTab === 'foreignKeys' && (
          <button
            onClick={handleAddForeignKey}
            style={{
              height: 22,
              padding: '0 8px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Thêm khoá ngoại (FK)
          </button>
        )}

        <button
          onClick={handleOpenPreview}
          style={{
            height: 22,
            padding: '0 8px',
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--text)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          👁 Xem trước & Áp dụng DDL
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button
            onClick={() => setActiveSubTab('fields')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeSubTab === 'fields' ? 'var(--pane)' : 'transparent',
              color: activeSubTab === 'fields' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeSubTab === 'fields' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Cột ({fields.length})
          </button>

          <button
            onClick={() => setActiveSubTab('indexes')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeSubTab === 'indexes' ? 'var(--pane)' : 'transparent',
              color: activeSubTab === 'indexes' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeSubTab === 'indexes' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Chỉ mục ({indexes.length})
          </button>

          <button
            onClick={() => setActiveSubTab('foreignKeys')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeSubTab === 'foreignKeys' ? 'var(--pane)' : 'transparent',
              color: activeSubTab === 'foreignKeys' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeSubTab === 'foreignKeys' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Khoá ngoại ({foreignKeys.length})
          </button>

          <button
            onClick={() => setActiveSubTab('ddl')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeSubTab === 'ddl' ? 'var(--pane)' : 'transparent',
              color: activeSubTab === 'ddl' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeSubTab === 'ddl' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            SQL DDL
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--pane)' }}>
        {activeSubTab === 'fields' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                background: 'var(--pane2)',
                borderBottom: '1px solid var(--border)',
                fontWeight: 600,
                fontSize: 11,
                color: 'var(--text2)',
                position: 'sticky',
                top: 0,
              }}
            >
              <div style={{ padding: '6px 4px', textAlign: 'center' }}>#</div>
              <div style={{ padding: '6px 8px' }}>Tên cột</div>
              <div style={{ padding: '6px 8px' }}>Kiểu dữ liệu</div>
              <div style={{ padding: '6px 8px' }}>Độ dài</div>
              <div style={{ padding: '6px 8px' }}>Mặc định</div>
              <div style={{ padding: '6px 4px', textAlign: 'center' }}>PK</div>
              <div style={{ padding: '6px 4px', textAlign: 'center' }}>Null</div>
              <div style={{ padding: '6px 8px' }}>Ghi chú / Xoá</div>
            </div>

            {fields.map((f, i) => (
              <div
                key={f.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11.5,
                  alignItems: 'center',
                  background: f.isPrimaryKey ? 'var(--accent-subtle, rgba(0,100,250,0.04))' : 'transparent',
                }}
              >
                <div style={{ padding: '4px', textAlign: 'center', color: 'var(--text2)' }}>{i + 1}</div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => handleUpdateField(f.id, { name: e.target.value })}
                    style={{ width: '100%', border: '1px solid transparent', background: 'transparent', color: 'var(--text)', padding: '2px 4px' }}
                  />
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={f.type}
                    onChange={(e) => handleUpdateField(f.id, { type: e.target.value })}
                    style={{ width: '100%', border: '1px solid transparent', background: 'transparent', color: 'var(--text)', padding: '2px 4px' }}
                  />
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={f.length || ''}
                    onChange={(e) => handleUpdateField(f.id, { length: e.target.value })}
                    style={{ width: '100%', border: '1px solid transparent', background: 'transparent', color: 'var(--text)', padding: '2px 4px' }}
                  />
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={f.defaultValue || ''}
                    onChange={(e) => handleUpdateField(f.id, { defaultValue: e.target.value })}
                    style={{ width: '100%', border: '1px solid transparent', background: 'transparent', color: 'var(--text)', padding: '2px 4px' }}
                  />
                </div>
                <div style={{ padding: '4px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={f.isPrimaryKey}
                    onChange={(e) => handleUpdateField(f.id, { isPrimaryKey: e.target.checked })}
                  />
                </div>
                <div style={{ padding: '4px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={f.nullable}
                    onChange={(e) => handleUpdateField(f.id, { nullable: e.target.checked })}
                  />
                </div>
                <div style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <input
                    type="text"
                    placeholder="Ghi chú..."
                    value={f.comment || ''}
                    onChange={(e) => handleUpdateField(f.id, { comment: e.target.value })}
                    style={{ flex: 1, border: '1px solid transparent', background: 'transparent', color: 'var(--text2)', padding: '2px 4px' }}
                  />
                  <button
                    onClick={() => handleRemoveField(f.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'indexes' && (
          <div style={{ padding: 12 }}>
            {indexes.map((idx) => (
              <div
                key={idx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  background: 'var(--pane2)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <strong>{idx.name}</strong>
                <span>Cột: {idx.columns.join(', ')}</span>
                <span>Loại: {idx.type}</span>
                <span>Unique: {idx.unique ? 'Có' : 'Không'}</span>
                <button
                  onClick={() => setIndexes(indexes.filter((i) => i.id !== idx.id))}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'foreignKeys' && (
          <div style={{ padding: 12 }}>
            {foreignKeys.map((fk) => (
              <div
                key={fk.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  background: 'var(--pane2)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <strong>{fk.name}</strong>
                <span>{fk.column} → {fk.referencedTable}({fk.referencedColumn})</span>
                <span>ON DELETE: {fk.onDelete}</span>
                <button
                  onClick={() => setForeignKeys(foreignKeys.filter((f) => f.id !== fk.id))}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                >
                  Xoá
                </button>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'ddl' && (
          <div style={{ padding: 14 }}>
            <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', lineHeight: 1.5, background: 'var(--pane2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
              {previewSql || generated.statements.join('\n')}
            </pre>
          </div>
        )}
      </div>

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
              width: 580,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text)' }}>
              Xem trước & Áp dụng DDL SQL
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--text2)' }}>
              Các câu lệnh sau sẽ được thực thi trên database qua token an toàn:
            </p>
            <pre
              style={{
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 12,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                color: 'var(--text)',
                lineHeight: 1.5,
                maxHeight: 280,
                overflow: 'auto',
              }}
            >
              {previewSql || generated.statements.join('\n')}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '6px 14px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11.5,
                }}
              >
                Đóng
              </button>
              {previewToken && (
                <button
                  disabled={applying}
                  onClick={handleApplyDdl}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    borderRadius: 4,
                    cursor: applying ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 11.5,
                  }}
                >
                  {applying ? 'Đang thực thi...' : 'Áp dụng DDL'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
