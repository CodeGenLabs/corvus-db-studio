import { useState } from 'react'

export interface Snippet {
  id: string
  label: string
  category: string
  template: string
}

export interface SnippetPickerProps {
  onInsertSnippet: (snippetText: string) => void
  onClose: () => void
}

export function SnippetPicker({ onInsertSnippet, onClose }: SnippetPickerProps) {
  const [filter, setFilter] = useState('')

  const snippets: Snippet[] = [
    { id: 's1', label: 'SELECT cơ bản', category: 'DML', template: 'SELECT * FROM ${table} WHERE ${condition} LIMIT 100;' },
    { id: 's2', label: 'INSERT dòng mới', category: 'DML', template: 'INSERT INTO ${table} (${columns})\nVALUES (${values});' },
    { id: 's3', label: 'UPDATE có WHERE', category: 'DML', template: 'UPDATE ${table}\nSET ${column} = ${value}\nWHERE ${id_col} = ${id_val};' },
    { id: 's4', label: 'DELETE có WHERE', category: 'DML', template: 'DELETE FROM ${table}\nWHERE ${id_col} = ${id_val};' },
    { id: 's5', label: 'CREATE TABLE mẫu', category: 'DDL', template: 'CREATE TABLE `${table_name}` (\n  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,\n  `name` VARCHAR(255) NOT NULL,\n  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);' },
    { id: 's6', label: 'CREATE INDEX', category: 'DDL', template: 'CREATE INDEX `idx_${table}_${col}` ON `${table}` (`${col}`);' },
    { id: 's7', label: 'CREATE TRIGGER audit log', category: 'DDL', template: 'CREATE TRIGGER `trg_after_${table}_update`\nAFTER UPDATE ON `${table}`\nFOR EACH ROW\nBEGIN\n  INSERT INTO audit_log (table_name, action, record_id, changed_at)\n  VALUES (\'${table}\', \'UPDATE\', NEW.id, NOW());\nEND;' },
  ]

  const filtered = snippets.filter(
    (s) => s.label.toLowerCase().includes(filter.toLowerCase()) || s.category.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        left: 20,
        width: 320,
        background: 'var(--pane)',
        border: '1px solid var(--border-strong)',
        borderRadius: 6,
        boxShadow: 'var(--shadow)',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 20,
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>🧩 Đoạn mã mẫu (SQL Snippets)</span>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Tìm snippet…"
        style={{
          height: 22,
          padding: '0 6px',
          background: 'var(--pane2)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: 'var(--text)',
        }}
      />

      <div style={{ maxHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((s) => (
          <div
            key={s.id}
            onClick={() => {
              onInsertSnippet(s.template)
              onClose()
            }}
            className="hv-row"
            style={{
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              background: 'var(--pane2)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: 'var(--text)' }}>{s.label}</strong>
              <span style={{ fontSize: 9.5, padding: '1px 4px', borderRadius: 2, background: 'var(--pane)', color: 'var(--text3)' }}>
                {s.category}
              </span>
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--text3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.template.split('\n')[0]}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
