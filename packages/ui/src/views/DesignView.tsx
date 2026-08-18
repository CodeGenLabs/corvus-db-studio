import { useState } from 'react'
import { useStudio } from '../store/studio'
import { generateCreateTable } from '@corvus/sql'
import type { FieldDesign, IndexDesign, ForeignKeyDesign, TableDesign } from '@corvus/contract'

const COLS = '30px 1fr 140px 80px 100px 60px 60px 1fr'

export function DesignView() {
  const { s, set, t, row } = useStudio()

  const [activeTab, setActiveTab] = useState<'fields' | 'indexes' | 'foreignKeys' | 'ddl'>('fields')
  const [fields, setFields] = useState<FieldDesign[]>([
    { id: 'f-1', name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, autoIncrement: true },
    { id: 'f-2', name: 'country', type: 'VARCHAR', length: '50', nullable: false, isPrimaryKey: false },
    { id: 'f-3', name: 'last_update', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ])

  const [indexes, setIndexes] = useState<IndexDesign[]>([
    { id: 'idx-1', name: 'idx_country', columns: ['country'], unique: false, type: 'BTREE' },
  ])

  const [foreignKeys, setForeignKeys] = useState<ForeignKeyDesign[]>([])

  const [showPreviewModal, setShowPreviewModal] = useState(false)

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
      name: `fk_${s.selTable || 'table'}_ref`,
      column: fields[0]?.name || 'id',
      referencedTable: 'other_table',
      referencedColumn: 'id',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }
    setForeignKeys([...foreignKeys, newFk])
  }

  const tableDesign: TableDesign = {
    name: s.selTable || 'new_table',
    fields,
    indexes,
    foreignKeys,
  }

  const generated = generateCreateTable(tableDesign, 'mysql')

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
        {activeTab === 'fields' && (
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

        {activeTab === 'indexes' && (
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

        {activeTab === 'foreignKeys' && (
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
          onClick={() => setShowPreviewModal(true)}
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
          👁 Xem trước DDL SQL
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button
            onClick={() => setActiveTab('fields')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeTab === 'fields' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'fields' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeTab === 'fields' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Cột ({fields.length})
          </button>

          <button
            onClick={() => setActiveTab('indexes')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeTab === 'indexes' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'indexes' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeTab === 'indexes' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Chỉ mục ({indexes.length})
          </button>

          <button
            onClick={() => setActiveTab('foreignKeys')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeTab === 'foreignKeys' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'foreignKeys' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeTab === 'foreignKeys' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Khoá ngoại ({foreignKeys.length})
          </button>

          <button
            onClick={() => setActiveTab('ddl')}
            style={{
              height: 22,
              padding: '0 8px',
              border: 'none',
              borderRadius: 3,
              background: activeTab === 'ddl' ? 'var(--pane)' : 'transparent',
              color: activeTab === 'ddl' ? 'var(--accent)' : 'var(--text2)',
              fontSize: 11,
              fontWeight: activeTab === 'ddl' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            DDL SQL
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'fields' && (
          <div>
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                display: 'grid',
                gridTemplateColumns: COLS,
                background: 'var(--pane2)',
                borderBottom: '1px solid var(--border-strong)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text2)',
              }}
            >
              <div style={{ padding: '5px 6px', borderRight: '1px solid var(--grid-line)' }} />
              <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>{t.fName}</div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>{t.fType}</div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'right' }}>{t.fLength}</div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)' }}>{t.fDefault}</div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'center' }}>{t.fNotNull}</div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid var(--grid-line)', textAlign: 'center' }}>{t.fKey}</div>
              <div style={{ padding: '5px 8px' }}>Hành động</div>
            </div>

            {fields.map((f, i) => {
              const sel = s.selField === f.name
              return (
                <div
                  key={f.id}
                  className="hv-row"
                  onClick={() => set({ selField: f.name })}
                  style={row({
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    background: sel ? 'var(--sel)' : 'transparent',
                    cursor: 'pointer',
                    alignItems: 'center',
                  })}
                >
                  <div
                    style={{
                      padding: '0 6px',
                      textAlign: 'right',
                      color: 'var(--text3)',
                      fontFamily: 'var(--mono)',
                      fontSize: 10.5,
                      borderRight: '1px solid var(--grid-line)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ padding: '0 8px', borderRight: '1px solid var(--grid-line)' }}>
                    <input
                      value={f.name}
                      onChange={(e) => handleUpdateField(f.id, { name: e.target.value })}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontFamily: 'var(--mono)',
                        fontSize: 11.5,
                      }}
                    />
                  </div>
                  <div style={{ padding: '0 8px', borderRight: '1px solid var(--grid-line)' }}>
                    <select
                      value={f.type}
                      onChange={(e) => handleUpdateField(f.id, { type: e.target.value })}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text2)',
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                      }}
                    >
                      <option value="INT">INT</option>
                      <option value="BIGINT">BIGINT</option>
                      <option value="VARCHAR">VARCHAR</option>
                      <option value="TEXT">TEXT</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="TIMESTAMP">TIMESTAMP</option>
                      <option value="JSON">JSON</option>
                    </select>
                  </div>
                  <div style={{ padding: '0 8px', textAlign: 'right', borderRight: '1px solid var(--grid-line)' }}>
                    <input
                      value={f.length || ''}
                      onChange={(e) => handleUpdateField(f.id, { length: e.target.value })}
                      style={{
                        width: '100%',
                        textAlign: 'right',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text2)',
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                      }}
                    />
                  </div>
                  <div style={{ padding: '0 8px', borderRight: '1px solid var(--grid-line)' }}>
                    <input
                      value={f.defaultValue || ''}
                      onChange={(e) => handleUpdateField(f.id, { defaultValue: e.target.value })}
                      placeholder="NULL"
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text3)',
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                      }}
                    />
                  </div>
                  <div style={{ padding: '0 8px', textAlign: 'center', borderRight: '1px solid var(--grid-line)' }}>
                    <input
                      type="checkbox"
                      checked={!f.nullable}
                      onChange={(e) => handleUpdateField(f.id, { nullable: !e.target.checked })}
                    />
                  </div>
                  <div style={{ padding: '0 8px', textAlign: 'center', borderRight: '1px solid var(--grid-line)' }}>
                    <input
                      type="checkbox"
                      checked={!!f.isPrimaryKey}
                      onChange={(e) => handleUpdateField(f.id, { isPrimaryKey: e.target.checked })}
                    />
                  </div>
                  <div style={{ padding: '0 8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveField(f.id)
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 10.5,
                      }}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'indexes' && (
          <div style={{ padding: 12 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px 100px 80px', padding: '6px 10px', background: 'var(--pane2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                <div>Tên chỉ mục (Index Name)</div>
                <div>Cột áp dụng</div>
                <div>Loại (Type)</div>
                <div style={{ textAlign: 'center' }}>Unique</div>
                <div style={{ textAlign: 'right' }}>Hành động</div>
              </div>
              {indexes.map((idx, i) => (
                <div key={idx.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px 100px 80px', padding: '6px 10px', alignItems: 'center', borderBottom: '1px solid var(--grid-line)', fontSize: 11.5 }}>
                  <input
                    value={idx.name}
                    onChange={(e) => {
                      const next = [...indexes]
                      next[i] = { ...idx, name: e.target.value }
                      setIndexes(next)
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'var(--mono)' }}
                  />
                  <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                    {idx.columns.join(', ')}
                  </div>
                  <div style={{ color: 'var(--text2)' }}>{idx.type || 'BTREE'}</div>
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={idx.unique}
                      onChange={(e) => {
                        const next = [...indexes]
                        next[i] = { ...idx, unique: e.target.checked }
                        setIndexes(next)
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setIndexes(indexes.filter((x) => x.id !== idx.id))}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'foreignKeys' && (
          <div style={{ padding: 12 }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 120px 100px 80px', padding: '6px 10px', background: 'var(--pane2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>
                <div>Tên ràng buộc (Constraint)</div>
                <div>Cột nguồn</div>
                <div>Bảng tham chiếu</div>
                <div>Cột đích</div>
                <div>ON DELETE</div>
                <div style={{ textAlign: 'right' }}>Hành động</div>
              </div>
              {foreignKeys.map((fk, i) => (
                <div key={fk.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 120px 100px 80px', padding: '6px 10px', alignItems: 'center', borderBottom: '1px solid var(--grid-line)', fontSize: 11.5 }}>
                  <input
                    value={fk.name}
                    onChange={(e) => {
                      const next = [...foreignKeys]
                      next[i] = { ...fk, name: e.target.value }
                      setForeignKeys(next)
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontFamily: 'var(--mono)' }}
                  />
                  <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{fk.column}</div>
                  <div style={{ color: 'var(--text)' }}>{fk.referencedTable}</div>
                  <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{fk.referencedColumn}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 11 }}>{fk.onDelete || 'RESTRICT'}</div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setForeignKeys(foreignKeys.filter((x) => x.id !== fk.id))}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ddl' && (
          <div style={{ padding: 14 }}>
            <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', lineHeight: 1.5, background: 'var(--pane2)', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
              {generated.statements.join('\n')}
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
              width: 560,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text)' }}>Xem trước DDL SQL</h3>
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
              {generated.statements.join('\n')}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
