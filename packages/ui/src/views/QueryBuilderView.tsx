import { useState } from 'react'
import { selectValue } from '../utils/select-value'
import { useStudio } from '../store/studio'
import { buildSelect, type QueryModel } from '@corvus/sql'

export function QueryBuilderView() {
  const { setView } = useStudio()
  const goSql = setView('sql')

  const [model, setModel] = useState<QueryModel>({
    tables: [
      { name: 'customer', alias: 'c' },
      { name: 'payment', alias: 'p' },
    ],
    fields: [
      { table: 'c', name: 'customer_id' },
      { table: 'c', name: 'first_name' },
      { table: 'c', name: 'last_name' },
      { table: 'p', name: 'amount', agg: 'SUM', alias: 'total_spent' },
    ],
    joins: [
      {
        type: 'INNER',
        fromTable: 'c',
        fromField: 'customer_id',
        toTable: 'p',
        toField: 'customer_id',
      },
    ],
    where: [
      { table: 'c', field: 'active', op: '=', value: '1' },
    ],
    groupBy: [
      { table: 'c', field: 'customer_id' },
      { table: 'c', field: 'first_name' },
      { table: 'c', field: 'last_name' },
    ],
    orderBy: [
      { table: 'p', field: 'total_spent', dir: 'DESC' },
    ],
    limit: 20,
  })

  const [activeTab, setActiveTab] = useState<'tables' | 'fields' | 'joins' | 'where' | 'order'>('fields')

  const generatedSql = buildSelect(model, 'mysql')

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
          onClick={goSql}
          style={{
            height: 22,
            padding: '0 10px',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ▶ Chạy trong SQL Editor
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          {(
            [
              ['tables', `Bảng (${model.tables.length})`],
              ['fields', `Cột (${model.fields.length})`],
              ['joins', `Liên kết (${model.joins?.length || 0})`],
              ['where', `Điều kiện (${model.where?.length || 0})`],
              ['order', 'Sắp xếp & Giới hạn'],
            ] as const
          ).map(([tKey, label]) => (
            <button
              key={tKey}
              onClick={() => setActiveTab(tKey)}
              style={{
                height: 22,
                padding: '0 8px',
                border: 'none',
                borderRadius: 3,
                background: activeTab === tKey ? 'var(--pane)' : 'transparent',
                color: activeTab === tKey ? 'var(--accent)' : 'var(--text2)',
                fontWeight: activeTab === tKey ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left builder controls */}
        <div style={{ flex: 1, padding: 14, overflow: 'auto', borderRight: '1px solid var(--border)' }}>
          {activeTab === 'tables' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text)' }}>Các bảng tham gia truy vấn</h4>
              {model.tables.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    value={t.name}
                    onChange={(e) => {
                      const next = [...model.tables]
                      next[idx] = { ...t, name: e.target.value }
                      setModel({ ...model, tables: next })
                    }}
                    style={{ padding: '4px 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>AS</span>
                  <input
                    value={t.alias || ''}
                    placeholder="Alias"
                    onChange={(e) => {
                      const next = [...model.tables]
                      next[idx] = { ...t, alias: e.target.value }
                      setModel({ ...model, tables: next })
                    }}
                    style={{ width: 60, padding: '4px 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fields' && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>Danh sách cột chọn (SELECT)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {model.fields.map((f, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 140px 90px 100px', gap: 6, alignItems: 'center' }}>
                    <input
                      value={f.table || ''}
                      placeholder="Table"
                      onChange={(e) => {
                        const next = [...model.fields]
                        next[idx] = { ...f, table: e.target.value }
                        setModel({ ...model, fields: next })
                      }}
                      style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}
                    />
                    <input
                      value={f.name}
                      onChange={(e) => {
                        const next = [...model.fields]
                        next[idx] = { ...f, name: e.target.value }
                        setModel({ ...model, fields: next })
                      }}
                      style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11 }}
                    />
                    <select
                      value={f.agg || ''}
                      onChange={(e) => {
                        const next = [...model.fields]
                        next[idx] = { ...f, agg: e.target.value === '' ? undefined : selectValue(e.target.value, ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'], 'COUNT') }
                        setModel({ ...model, fields: next })
                      }}
                      style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text2)', fontSize: 11 }}
                    >
                      <option value="">Không gom</option>
                      <option value="COUNT">COUNT</option>
                      <option value="SUM">SUM</option>
                      <option value="AVG">AVG</option>
                      <option value="MIN">MIN</option>
                      <option value="MAX">MAX</option>
                    </select>
                    <input
                      value={f.alias || ''}
                      placeholder="Alias"
                      onChange={(e) => {
                        const next = [...model.fields]
                        next[idx] = { ...f, alias: e.target.value }
                        setModel({ ...model, fields: next })
                      }}
                      style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'joins' && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>Liên kết bảng (JOINs)</h4>
              {model.joins?.map((j, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{j.type} JOIN</span>
                  <span style={{ color: 'var(--text)' }}>{j.toTable}</span>
                  <span style={{ color: 'var(--text3)' }}>ON</span>
                  <span style={{ color: 'var(--text)' }}>{j.fromTable}.{j.fromField} = {j.toTable}.{j.toField}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'where' && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>Điều kiện lọc (WHERE)</h4>
              {model.where?.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
                  <span style={{ color: 'var(--text)' }}>{w.table ? `${w.table}.${w.field}` : w.field}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{w.op}</span>
                  <span style={{ color: 'var(--amber)' }}>{w.value}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'order' && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>Sắp xếp & Giới hạn</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 11.5 }}>
                <span>Giới hạn kết quả (LIMIT):</span>
                <input
                  type="number"
                  value={model.limit || 100}
                  onChange={(e) => setModel({ ...model, limit: parseInt(e.target.value, 10) || 100 })}
                  style={{ width: 80, padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', fontFamily: 'var(--mono)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right realtime SQL preview */}
        <div style={{ width: 340, background: 'var(--pane2)', padding: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
            ⚡ Xem trước câu lệnh SQL sinh tự động
          </div>
          <textarea
            readOnly
            value={generatedSql}
            style={{
              flex: 1,
              width: '100%',
              background: 'var(--pane)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text)',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              padding: 8,
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>
    </div>
  )
}
