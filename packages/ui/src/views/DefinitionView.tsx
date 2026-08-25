import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useClient, useStudio } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'

export function DefinitionView() {
  const { t, activeTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const [copied, setCopied] = useState(false)

  const tab = activeTab()
  const identity = tab?.identity.type === 'object' ? tab.identity : undefined

  const connectionId = identity?.connectionId ?? ctx.connectionId ?? ''
  const database = identity?.database ?? ctx.database ?? undefined
  const schema = identity?.namespace ?? ctx.namespace ?? undefined
  const name = identity?.name ?? ctx.selection.primaryTarget ?? ''
  const kind = identity?.objectKind ?? ctx.selection.objectKind ?? 'table'

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ddl', connectionId, database, schema, name, kind],
    queryFn: async () => {
      if (!connectionId || !name) return { ddl: '-- Chưa chọn đối tượng' }
      return client.request<{ ddl: string }>('introspect.ddl', {
        connectionId,
        database,
        schema,
        name,
        kind,
      })
    },
    enabled: !!connectionId && !!name,
  })

  const ddlText = data?.ddl ?? ''

  const handleCopy = async () => {
    if (!ddlText) return
    try {
      await navigator.clipboard.writeText(ddlText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const breadcrumb = [
    connectionId,
    database,
    schema,
    kind ? `[${kind}]` : '',
    name,
  ]
    .filter(Boolean)
    .join(' › ')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--pane)',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 12,
          flex: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'var(--accent-dim, rgba(66, 133, 244, 0.15))',
              color: 'var(--accent)',
              textTransform: 'uppercase',
            }}
          >
            {kind}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{name}</span>
          <span style={{ color: 'var(--text3)', fontSize: 11 }}>{breadcrumb}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => void refetch()}
            className="btn-ghost"
            style={{
              padding: '3px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text2)',
            }}
          >
            {t.loading ? '↻' : 'Refresh'}
          </button>
          <button
            onClick={handleCopy}
            className="btn-ghost"
            style={{
              padding: '3px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              background: copied ? 'var(--accent)' : 'transparent',
              color: copied ? '#fff' : 'var(--text2)',
            }}
          >
            {copied ? '✓ Copied' : 'Copy SQL'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
        {isLoading && (
          <div style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
            {t.loading}
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--red)', padding: 8 }}>
            {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {!isLoading && !error && (
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--mono, "IBM Plex Mono", monospace)',
              fontSize: 12.5,
              lineHeight: 1.5,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {ddlText || '-- Không có định nghĩa'}
          </pre>
        )}
      </div>
    </div>
  )
}
