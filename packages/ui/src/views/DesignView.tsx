import { useState } from 'react'
import { useStudio } from '../store/studio'
import { generateCreateTable } from '@corvus/sql'
import type { FieldDesign, TableDesign } from '@corvus/contract'

const COLS = '30px 1fr 140px 80px 100px 60px 60px 1fr'

export function DesignView() {
  const { s, set, t, row } = useStudio()

  const [activeTab, setActiveTab] = useState<'fields' | 'indexes' | 'foreignKeys' | 'ddl'>('fields')
  const [fields, setFields] = useState<FieldDesign[]>([
    { id: 'f-1', name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, autoIncrement: true },
    { id: 'f-2', name: 'country', type: 'VARCHAR', length: '50', nullable: false, isPrimaryKey: false },
    { id: 'f-3', name: 'last_update', type: 'TIMESTAMP', nullable: false, isPrimaryKey: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ])

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

  const tableDesign: TableDesign = {
    name: s.selTable || 'new_table',
    fields,
    indexes: [],
    foreignKeys: [],
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
        {activeTab === 'fields' ? (
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
                      checked={f.isPrimaryKey}
                      onChange={(e) => handleUpdateField(f.id, { isPrimaryKey: e.target.checked })}
                    />
                  </div>
                  <div style={{ padding: '0 8px', display: 'flex', gap: 6 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveField(f.id)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: 14, fontFamily: 'var(--mono)', fontSize: 12 }}>
            <pre style={{ margin: 0, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
              {generated.statements.join('\n\n')}
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
              width: 540,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text)' }}>Xem trước câu lệnh DDL</h3>
            {generated.warnings.map((w, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  marginBottom: 8,
                  borderRadius: 4,
                  background: w.level === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: w.level === 'danger' ? '#ef4444' : '#eab308',
                  fontSize: 11.5,
                }}
              >
                ⚠ {w.message}
              </div>
            ))}
            <textarea
              readOnly
              value={generated.statements.join('\n\n')}
              style={{
                width: '100%',
                height: 180,
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                padding: 8,
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '6px 14px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  borderRadius: 4,
                  color: 'var(--text)',
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
