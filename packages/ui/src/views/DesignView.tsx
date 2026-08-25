import { useEffect, useState } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { generateCreateTable } from '@corvus/sql'
import type { FieldDesign, IndexDesign, ForeignKeyDesign, TableDesign, TableMeta } from '@corvus/contract'

const COLS = '30px 1fr 140px 80px 100px 60px 60px 1fr'

export function DesignView() {
  const { activeTab, t } = useStudio()
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
    name: table || 'new_table',
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
      setPreviewToken('preview-mock-token')
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
    <div data-testid="table-designer" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            type="button"
            data-testid="btn-add-field"
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
            + {t.addColumn}
          </button>
        )}

        {activeSubTab === 'indexes' && (
          <button
            type="button"
            data-testid="btn-add-index"
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
            + {t.addIndex}
          </button>
        )}

        {activeSubTab === 'foreignKeys' && (
          <button
            type="button"
            data-testid="btn-add-fk"
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
            + {t.addForeignKey}
          </button>
        )}

        <button
          type="button"
          data-testid="btn-preview-ddl"
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

        {/* ── 4 Navicat Standard Tabs ── */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button
            type="button"
            data-testid="tab-fields"
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
            {t.tabFields} ({fields.length})
          </button>

          <button
            type="button"
            data-testid="tab-indexes"
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
            {t.tabIndexes} ({indexes.length})
          </button>

          <button
            type="button"
            data-testid="tab-foreign-keys"
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
            {t.tabForeignKeys} ({foreignKeys.length})
          </button>

          <button
            type="button"
            data-testid="tab-sql-preview"
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
            {t.tabSqlPreview}
          </button>
        </div>
      </div>

      {/* ── SubTab Contents ── */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--pane)' }}>
        {activeSubTab === 'fields' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                background: 'var(--pane2)',
                borderBottom: '1px solid var(--border-strong)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text2)',
                position: 'sticky',
                top: 0,
              }}
            >
              <div style={{ padding: '6px' }}>#</div>
              <div style={{ padding: '6px 8px' }}>Tên trường (Name)</div>
              <div style={{ padding: '6px 8px' }}>Kiểu (Type)</div>
              <div style={{ padding: '6px 8px' }}>Độ dài (Length)</div>
              <div style={{ padding: '6px 8px' }}>Mặc định (Default)</div>
              <div style={{ padding: '6px 8px', textAlign: 'center' }}>Not Null</div>
              <div style={{ padding: '6px 8px', textAlign: 'center' }}>PK</div>
              <div style={{ padding: '6px 8px' }}>Ghi chú (Comment)</div>
            </div>

            {fields.map((f, i) => (
              <div
                key={f.id}
                data-testid={`field-row-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  borderBottom: '1px solid var(--grid-line)',
                  fontSize: 11.5,
                  alignItems: 'center',
                }}
              >
                <div style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--text3)' }}>{i + 1}</div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    data-testid={`input-field-name-${i}`}
                    value={f.name}
                    onChange={(e) => handleUpdateField(f.id, { name: e.target.value })}
                    style={{ width: '100%', height: 22, background: 'transparent', border: 'none', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    data-testid={`input-field-type-${i}`}
                    value={f.type}
                    onChange={(e) => handleUpdateField(f.id, { type: e.target.value })}
                    style={{ width: '100%', height: 22, background: 'transparent', border: 'none', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={f.length || ''}
                    onChange={(e) => handleUpdateField(f.id, { length: e.target.value })}
                    style={{ width: '100%', height: 22, background: 'transparent', border: 'none', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ padding: '2px 4px' }}>
                  <input
                    type="text"
                    value={f.defaultValue || ''}
                    onChange={(e) => handleUpdateField(f.id, { defaultValue: e.target.value })}
                    style={{ width: '100%', height: 22, background: 'transparent', border: 'none', color: 'var(--text)' }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!f.nullable}
                    onChange={(e) => handleUpdateField(f.id, { nullable: !e.target.checked })}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={f.isPrimaryKey}
                    onChange={(e) => handleUpdateField(f.id, { isPrimaryKey: e.target.checked })}
                  />
                </div>
                <div style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={f.comment || ''}
                    onChange={(e) => handleUpdateField(f.id, { comment: e.target.value })}
                    style={{ flex: 1, height: 22, background: 'transparent', border: 'none', color: 'var(--text)' }}
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'indexes' && (
          <div style={{ padding: 12 }}>
            {indexes.map((idx, i) => (
              <div key={idx.id} data-testid={`index-row-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 80, fontSize: 11, color: 'var(--text2)' }}>{idx.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                  ({idx.columns.join(', ')})
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>{idx.type}</span>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'foreignKeys' && (
          <div style={{ padding: 12 }}>
            {foreignKeys.map((fk, i) => (
              <div key={fk.id} data-testid={`fk-row-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 100, fontSize: 11, color: 'var(--text2)' }}>{fk.name}</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                  {fk.column} → {fk.referencedTable}({fk.referencedColumn})
                </span>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'ddl' && (
          <div style={{ padding: 12 }}>
            <pre data-testid="sql-preview-text" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {generated.statements.join('\n\n')}
            </pre>
          </div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      {showPreviewModal && (
        <div
          data-testid="modal-preview-ddl"
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
              width: 600,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
              Xác nhận thực thi DDL (Preview Token)
            </h3>
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
                maxHeight: 250,
                overflow: 'auto',
              }}
            >
              {previewSql}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                data-testid="btn-cancel-ddl"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11.5,
                }}
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                data-testid="btn-apply-ddl"
                onClick={handleApplyDdl}
                disabled={applying}
                style={{
                  padding: '5px 14px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11.5,
                }}
              >
                {applying ? 'Đang áp dụng...' : 'Áp dụng DDL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
