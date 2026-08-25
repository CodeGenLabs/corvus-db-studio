import { useState } from 'react'
import { selectValue } from '../utils/select-value'
import { useStudio, useClient } from '../store/studio'

interface RoutineParam {
  id: string
  mode: 'IN' | 'OUT' | 'INOUT'
  name: string
  type: string
}

export function RoutineDesigner() {
  const { activeTab } = useStudio()
  const client = useClient()

  const tab = activeTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'

  const [name, setName] = useState('sp_calculate_customer_discount')
  const [kind, setKind] = useState<'PROCEDURE' | 'FUNCTION'>('PROCEDURE')
  const [returnType, setReturnType] = useState('DECIMAL(10,2)')
  const [deterministic, setDeterministic] = useState(false)
  const [params, setParams] = useState<RoutineParam[]>([
    { id: 'p1', mode: 'IN', name: 'p_customer_id', type: 'INT' },
    { id: 'p2', mode: 'OUT', name: 'p_discount_rate', type: 'DECIMAL(5,2)' },
  ])
  const [body, setBody] = useState(
    `BEGIN\n  DECLARE v_total DECIMAL(10,2);\n  \n  SELECT SUM(amount) INTO v_total FROM payment WHERE customer_id = p_customer_id;\n  \n  IF v_total > 1000 THEN\n    SET p_discount_rate = 0.15;\n  ELSEIF v_total > 500 THEN\n    SET p_discount_rate = 0.10;\n  ELSE\n    SET p_discount_rate = 0.05;\n  END IF;\nEND`,
  )
  const [applying, setApplying] = useState(false)

  const handleAddParam = () => {
    setParams([
      ...params,
      { id: `p-${Date.now()}`, mode: 'IN', name: `param_${params.length + 1}`, type: 'VARCHAR(255)' },
    ])
  }

  const ddlSql =
    kind === 'PROCEDURE'
      ? `CREATE PROCEDURE \`${name}\`(\n  ${params.map((p) => `${p.mode} ${p.name} ${p.type}`).join(',\n  ')}\n)\n${deterministic ? 'DETERMINISTIC\n' : ''}${body};`
      : `CREATE FUNCTION \`${name}\`(\n  ${params.map((p) => `${p.name} ${p.type}`).join(',\n  ')}\n)\nRETURNS ${returnType}\n${deterministic ? 'DETERMINISTIC\n' : ''}${body};`

  const handleApply = async () => {
    setApplying(true)
    try {
      if (client) {
        const preview = (await client.request('ddl.previewRoutine', {
          connectionId,
          routineDesign: { name, kind, returnType, deterministic, params, body, sql: ddlSql },
        })) as { previewToken: string; sql: string }
        if (preview?.previewToken) {
          await client.request('ddl.applyRoutine', {
            previewToken: preview.previewToken,
          })
        }
      }
      alert(`Đã tạo/cập nhật Routine "${name}" thành công!`)
    } catch (err) {
      alert(`Lỗi tạo Routine: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
          ⚡ Thiết kế Thủ tục & Hàm (Routine Designer)
        </span>
        <button
          disabled={applying}
          onClick={handleApply}
          style={{
            marginLeft: 'auto',
            height: 22,
            padding: '0 10px',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: 3,
            fontWeight: 600,
            cursor: applying ? 'not-allowed' : 'pointer',
            fontSize: 11,
          }}
        >
          {applying ? 'Đang thực thi...' : 'Áp dụng DDL Routine'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px 100px', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên Routine:</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Loại đối tượng:</label>
              <select
                value={kind}
                onChange={(e) => setKind(selectValue(e.target.value, ['PROCEDURE', 'FUNCTION'], 'PROCEDURE'))}
                style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
              >
                <option value="PROCEDURE">Thủ tục (Procedure)</option>
                <option value="FUNCTION">Hàm (Function)</option>
              </select>
            </div>

            {kind === 'FUNCTION' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Kiểu trả về:</label>
                <input
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value)}
                  style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 18 }}>
              <input
                type="checkbox"
                id="det-check"
                checked={deterministic}
                onChange={(e) => setDeterministic(e.target.checked)}
              />
              <label htmlFor="det-check" style={{ fontSize: 11, color: 'var(--text2)', cursor: 'pointer' }}>
                Deterministic
              </label>
            </div>
          </div>

          {/* Parameters table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)' }}>Tham số đầu vào / ra (Parameters):</label>
              <button
                onClick={handleAddParam}
                style={{ padding: '2px 8px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 10.5, fontWeight: 600 }}
              >
                + Thêm tham số
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {params.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '80px 140px 140px 40px', gap: 6, alignItems: 'center' }}>
                  <select
                    value={p.mode}
                    onChange={(e) => {
                      const next = [...params]
                      const target = next.find((x) => x.id === p.id)
                      if (target) target.mode = selectValue(e.target.value, ['IN', 'OUT', 'INOUT'], 'IN')
                      setParams(next)
                    }}
                    style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--accent)', fontSize: 11 }}
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                    <option value="INOUT">INOUT</option>
                  </select>

                  <input
                    value={p.name}
                    onChange={(e) => {
                      const next = [...params]
                      const target = next.find((x) => x.id === p.id)
                      if (target) target.name = e.target.value
                      setParams(next)
                    }}
                    style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11 }}
                  />

                  <input
                    value={p.type}
                    onChange={(e) => {
                      const next = [...params]
                      const target = next.find((x) => x.id === p.id)
                      if (target) target.type = e.target.value
                      setParams(next)
                    }}
                    style={{ padding: '3px 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11 }}
                  />

                  <button
                    onClick={() => setParams(params.filter((x) => x.id !== p.id))}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                  >
                    Xoá
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Thân hàm / thủ tục (Routine Body):</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--pane)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                padding: 10,
                lineHeight: 1.5,
                resize: 'none',
              }}
            />
          </div>
        </div>

        {/* Right DDL Preview */}
        <div style={{ width: 340, background: 'var(--pane2)', padding: 12, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
            ⚡ Xem trước DDL Routine
          </div>
          <textarea
            readOnly
            value={ddlSql}
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
