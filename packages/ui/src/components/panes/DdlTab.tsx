import { useState } from 'react'

export interface DdlTabProps {
  ddl: string
  objectName: string
  onCopyDdl?: () => void
}

export function DdlTab({ ddl, onCopyDdl }: DdlTabProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(ddl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    onCopyDdl?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 11 }}>
      <div
        style={{
          height: 28,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text2)' }}>📜 DDL Definition</span>
        <button
          onClick={handleCopy}
          style={{
            padding: '2px 8px',
            fontSize: 10.5,
            border: '1px solid var(--border)',
            background: 'transparent',
            borderRadius: 3,
            color: copied ? '#10b981' : 'var(--text)',
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Đã sao chép' : 'Sao chép DDL'}
        </button>
      </div>

      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: 10,
          overflow: 'auto',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          lineHeight: 1.45,
          color: 'var(--text)',
          background: 'var(--pane)',
        }}
      >
        <code>{ddl || '-- No DDL available'}</code>
      </pre>
    </div>
  )
}
