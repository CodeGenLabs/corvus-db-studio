import { useState } from 'react'
import { Modal } from './Modal'
import { useStudio, useClient } from '../../store/studio'
import { useActiveContext } from '../../context/useActiveContext'
import { quoteIdentifier } from '@corvus/sql'
import type { ObjectKind } from '@corvus/contract'

export interface FindResultItem {
  table: string
  column: string
  val: string
  rowSnippet: string
}

export type FindMatchMode = 'contains' | 'exact' | 'starts_with'

export function FindInDatabaseDialog() {
  const { set, t, openTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()

  const connectionId = ctx.connectionId || 'conn-1'
  const database = ctx.database
  const schema = ctx.namespace

  const [keyword, setKeyword] = useState('')
  const [matchMode, setMatchMode] = useState<FindMatchMode>('contains')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<FindResultItem[]>([])
  const [statusText, setStatusText] = useState('')

  const handleSearch = async () => {
    if (!keyword.trim() || !client) return
    setSearching(true)
    setResults([])
    setStatusText('Đang tìm kiếm...')

    try {
      // 1. Lấy danh sách bảng trong schema/database
      const objects = await client.request<Array<{ name: string; kind: string }>>('introspect.objects', {
        connectionId,
        database: database ?? undefined,
        schema: schema ?? undefined,
        kind: 'table',
      })

      const tables = objects.map((o) => o.name)
      const found: FindResultItem[] = []

      for (const tbl of tables.slice(0, 15)) {
        try {
          const meta = await client.request<{ columns?: Array<{ name: string; dataType?: string }> }>('introspect.tableMeta', {
            connectionId,
            database: database ?? undefined,
            schema: schema ?? undefined,
            table: tbl,
          })

          const textCols = (meta.columns || []).filter((c) =>
            /char|text|varchar|string|json/i.test(c.dataType || 'varchar'),
          )

          if (textCols.length > 0) {
            const safeKeyword = keyword.replace(/'/g, "''")
            const safeWhereParts = textCols.map((c) => {
              const quotedCol = quoteIdentifier(c.name)
              if (matchMode === 'exact') return quotedCol + " = '" + safeKeyword + "'"
              if (matchMode === 'starts_with') return quotedCol + " LIKE '" + safeKeyword + "%'"
              return quotedCol + " LIKE '%" + safeKeyword + "%'"
            })

            const safeTbl = quoteIdentifier(tbl)
            const safeSql = 'SELECT * FROM ' + safeTbl + ' WHERE ' + safeWhereParts.join(' OR ') + ' LIMIT 10;'
            const stream = client.stream('query.execute', { sql: safeSql, connectionId })

            for await (const rawChunk of stream) {
              const chunk = rawChunk as { rows?: unknown[][]; columns?: Array<{ name: string }> }
              if (chunk.rows && chunk.rows.length > 0) {
                for (const r of chunk.rows) {
                  found.push({
                    table: tbl,
                    column: textCols[0]?.name || 'column',
                    val: keyword,
                    rowSnippet: JSON.stringify(r),
                  })
                }
              }
            }
          }
        } catch {
          // Bỏ qua lỗi từng bảng
        }
      }

      setResults(found)
      setStatusText(`Hoàn tất: Tìm thấy ${found.length} kết quả phù hợp.`)
    } catch (err) {
      setStatusText(`Lỗi: ${(err as Error).message}`)
    } finally {
      setSearching(false)
    }
  }

  const handleOpenRow = (item: FindResultItem) => {
    openTab({
      type: 'object',
      contentKind: 'data',
      connectionId,
      database: database ?? undefined,
      namespace: schema ?? undefined,
      objectKind: 'table' as ObjectKind,
      name: item.table,
    })
    set({ dialog: null })
  }

  return (
    <Modal
      onClose={() => set({ dialog: null })}
      surface={{ width: 640 }}
    >
      <div data-testid="find-in-db-dialog" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
          🔍 {t.findInDatabase}
        </div>

        {/* ── Search Inputs ── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            data-testid="input-find-keyword"
            autoFocus
            value={keyword}
            placeholder="Nhập chuỗi văn bản cần tìm…"
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            style={{
              flex: 1,
              height: 28,
              padding: '0 8px',
              fontSize: 12,
              fontFamily: 'var(--mono)',
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              background: 'var(--pane)',
              color: 'var(--text)',
            }}
          />

          <select
            data-testid="select-find-mode"
            value={matchMode}
            onChange={(e) => setMatchMode(e.target.value as FindMatchMode)}
            style={{
              height: 28,
              padding: '0 6px',
              fontSize: 11.5,
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              background: 'var(--pane)',
              color: 'var(--text)',
            }}
          >
            <option value="contains">Chứa (Contains)</option>
            <option value="exact">Chính xác (Exact)</option>
            <option value="starts_with">Bắt đầu bằng (Starts with)</option>
          </select>

          <button
            type="button"
            data-testid="btn-start-find"
            onClick={handleSearch}
            disabled={searching || !keyword.trim()}
            style={{
              height: 28,
              padding: '0 14px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 4,
              color: 'var(--on-accent)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {searching ? 'Đang tìm…' : 'Tìm kiếm'}
          </button>
        </div>

        {/* ── Results Container ── */}
        <div
          data-testid="find-results-container"
          style={{
            height: 280,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--pane2)',
            overflow: 'auto',
            padding: 4,
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 11.5 }}>
              {statusText || 'Nhập từ khoá và nhấn "Tìm kiếm" để quét các bảng trong database.'}
            </div>
          ) : (
            results.map((item, i) => (
              <div
                key={i}
                data-testid={'find-result-row-' + i}
                onDoubleClick={() => handleOpenRow(item)}
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontSize: 11.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.table}</span>
                  <span style={{ color: 'var(--text3)' }}>•</span>
                  <span style={{ color: 'var(--text2)' }}>cột: {item.column}</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.rowSnippet}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text3)' }}>
          <span>{statusText}</span>
          <button
            type="button"
            onClick={() => set({ dialog: null })}
            style={{
              padding: '4px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  )
}
