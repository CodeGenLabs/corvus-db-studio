import { useState } from 'react'
import { useStudio } from '../store/studio'

export function TriggerDesigner() {
  const { s } = useStudio()
  const [triggerName, setTriggerName] = useState(`trg_${s.selTable || 'customer'}_audit`)
  const [timing, setTiming] = useState<'BEFORE' | 'AFTER'>('AFTER')
  const [event, setEvent] = useState<'INSERT' | 'UPDATE' | 'DELETE'>('UPDATE')
  const [targetTable, setTargetTable] = useState(s.selTable || 'customer')
  const [body, setBody] = useState(
    `BEGIN\n  IF OLD.email <> NEW.email THEN\n    INSERT INTO customer_audit_log (customer_id, old_email, new_email, changed_at)\n    VALUES (NEW.customer_id, OLD.email, NEW.email, NOW());\n  END IF;\nEND`,
  )

  const ddlSql = `CREATE TRIGGER \`${triggerName}\`\n${timing} ${event} ON \`${targetTable}\`\nFOR EACH ROW\n${body};`

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
          ⚡ Thiết kế Trigger (Trigger Designer)
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 140px', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên Trigger:</label>
              <input
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Thời điểm (Timing):</label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value as any)}
                style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
              >
                <option value="BEFORE">BEFORE</option>
                <option value="AFTER">AFTER</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Sự kiện (Event):</label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value as any)}
                style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
              >
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Bảng áp dụng:</label>
              <input
                value={targetTable}
                onChange={(e) => setTargetTable(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
              />
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Thân Trigger (Body):</label>
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
            ⚡ Xem trước DDL Trigger
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
