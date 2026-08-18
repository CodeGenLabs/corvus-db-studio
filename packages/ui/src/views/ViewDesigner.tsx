import { useState } from 'react'
import { useStudio } from '../store/studio'
import { formatSql } from '@corvus/sql'

export function ViewDesigner() {
  const { s, setView } = useStudio()
  const goSql = setView('sql')

  const [viewName, setViewName] = useState(s.selTable ? `v_${s.selTable}` : 'v_customer_summary')
  const [security, setSecurity] = useState<'DEFINER' | 'INVOKER'>('DEFINER')
  const [checkOption, setCheckOption] = useState<'NONE' | 'CASCADED' | 'LOCAL'>('NONE')
  const [query, setQuery] = useState(
    `SELECT \n  c.customer_id,\n  CONCAT(c.first_name, ' ', c.last_name) AS full_name,\n  c.email,\n  COUNT(r.rental_id) AS total_rentals\nFROM customer c\nLEFT JOIN rental r ON c.customer_id = r.customer_id\nGROUP BY c.customer_id, c.first_name, c.last_name, c.email`,
  )

  const ddlSql = `CREATE OR REPLACE SQL SECURITY ${security} VIEW \`${viewName}\` AS\n${query}${
    checkOption !== 'NONE' ? `\nWITH ${checkOption} CHECK OPTION;` : ';'
  }`

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
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>📐 Thiết kế Khung nhìn (View Designer)</span>
        <button
          onClick={goSql}
          style={{
            marginLeft: 'auto',
            height: 22,
            padding: '0 8px',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: 3,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ▶ Chạy trong SQL Editor
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left configurations & query editor */}
        <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên View:</label>
              <input
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>SQL Security:</label>
              <select
                value={security}
                onChange={(e) => setSecurity(e.target.value as any)}
                style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
              >
                <option value="DEFINER">DEFINER</option>
                <option value="INVOKER">INVOKER</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Check Option:</label>
              <select
                value={checkOption}
                onChange={(e) => setCheckOption(e.target.value as any)}
                style={{ width: '100%', height: 26, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11 }}
              >
                <option value="NONE">NONE</option>
                <option value="CASCADED">CASCADED</option>
                <option value="LOCAL">LOCAL</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Định nghĩa truy vấn SELECT (Query):</label>
              <button
                onClick={() => setQuery(formatSql(query))}
                style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }}
              >
                ✨ Định dạng SQL
              </button>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
            ⚡ Xem trước DDL View
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
