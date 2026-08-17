import { useState, useRef } from 'react'
import { useStudio, useClient } from '../store/studio'
import { DataGrid } from '../components/grid'
import { splitStatements } from '@corvus/sql'
import type { CellValue, ColumnDef } from '@corvus/contract'

interface QueryTabResult {
  statement: string
  columns: ColumnDef[]
  rows: CellValue[][]
  rowCount: number
  durationMs: number
  error?: string
}

export function SqlView() {
  const { t, setView } = useStudio()
  const client = useClient()
  const goCompare = setView('compare')

  const [sqlText, setSqlText] = useState(
    `-- Corvus DB Studio SQL Editor\nSELECT customer_id, first_name, last_name, email, active\nFROM customer\nWHERE active = 1\nORDER BY customer_id ASC\nLIMIT 20;\n\nSELECT film_id, title, release_year, rating\nFROM film\nLIMIT 10;`,
  )

  const [activeTab, setActiveTab] = useState<'results' | 'messages'>('results')
  const [activeResultIdx, setActiveResultIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<QueryTabResult[]>([
    {
      statement: 'SELECT customer_id, first_name, last_name, email, active FROM customer LIMIT 20',
      columns: [
        { name: 'customer_id', type: 'INT', align: 'r' },
        { name: 'first_name', type: 'VARCHAR', align: 't' },
        { name: 'last_name', type: 'VARCHAR', align: 't' },
        { name: 'email', type: 'VARCHAR', align: 't' },
        { name: 'active', type: 'TINYINT', align: 'r' },
      ],
      rows: [
        [{ k: 'num', v: 1 }, { k: 'str', v: 'MARY' }, { k: 'str', v: 'SMITH' }, { k: 'str', v: 'MARY.SMITH@sakilacustomer.org' }, { k: 'num', v: 1 }],
        [{ k: 'num', v: 2 }, { k: 'str', v: 'PATRICIA' }, { k: 'str', v: 'JOHNSON' }, { k: 'str', v: 'PATRICIA.JOHNSON@sakilacustomer.org' }, { k: 'num', v: 1 }],
        [{ k: 'num', v: 3 }, { k: 'str', v: 'LINDA' }, { k: 'str', v: 'WILLIAMS' }, { k: 'str', v: 'LINDA.WILLIAMS@sakilacustomer.org' }, { k: 'num', v: 1 }],
        [{ k: 'num', v: 4 }, { k: 'str', v: 'BARBARA' }, { k: 'str', v: 'JONES' }, { k: 'str', v: 'BARBARA.JONES@sakilacustomer.org' }, { k: 'num', v: 1 }],
        [{ k: 'num', v: 5 }, { k: 'str', v: 'ELIZABETH' }, { k: 'str', v: 'BROWN' }, { k: 'str', v: 'ELIZABETH.BROWN@sakilacustomer.org' }, { k: 'num', v: 1 }],
      ],
      rowCount: 5,
      durationMs: 8,
    },
  ])

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleRunQuery = async () => {
    setRunning(true)
    const statements = splitStatements(sqlText, 'mysql')
    const nextResults: QueryTabResult[] = []

    abortControllerRef.current = new AbortController()

    try {
      for (const stmt of statements) {
        const start = Date.now()
        try {
          if (client) {
            const stream = client.stream('query.execute', {
              sql: stmt,
              connectionId: 'conn-1',
            })

            let cols: ColumnDef[] = []
            const fetchedRows: CellValue[][] = []
            let count = 0

            for await (const rawChunk of stream) {
              const chunk = rawChunk as {
                columns?: Array<{ name: string; type: string; align?: string }>
                rows?: unknown[][]
                stats?: { rowCount?: number }
              }
              if (chunk.columns) {
                cols = chunk.columns.map((c) => ({
                  name: c.name,
                  type: c.type,
                  align: c.align as 'r' | 't' | 'm',
                }))
              }
              if (chunk.rows) {
                for (const r of chunk.rows) {
                  fetchedRows.push(
                    r.map((val: unknown) => {
                      if (val === null || val === 'NULL') return { k: 'null' }
                      if (typeof val === 'number') return { k: 'num', v: val }
                      if (typeof val === 'boolean') return { k: 'bool', v: val }
                      return { k: 'str', v: String(val) }
                    }),
                  )
                }
              }
              if (chunk.stats?.rowCount) {
                count = chunk.stats.rowCount
              }
            }

            nextResults.push({
              statement: stmt,
              columns: cols.length > 0 ? cols : [{ name: 'result', type: 'TEXT', align: 't' }],
              rows: fetchedRows,
              rowCount: count || fetchedRows.length,
              durationMs: Date.now() - start,
            })
          } else {
            // Fallback simulate
            await new Promise((r) => setTimeout(r, 100))
            nextResults.push({
              statement: stmt,
              columns: [{ name: 'id', type: 'INT', align: 'r' }, { name: 'value', type: 'VARCHAR', align: 't' }],
              rows: [[{ k: 'num', v: 1 }, { k: 'str', v: 'executed' }]],
              rowCount: 1,
              durationMs: 12,
            })
          }
        } catch (err) {
          nextResults.push({
            statement: stmt,
            columns: [],
            rows: [],
            rowCount: 0,
            durationMs: Date.now() - start,
            error: (err as Error).message,
          })
        }
      }

      setResults(nextResults)
      setActiveResultIdx(0)
    } finally {
      setRunning(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelQuery = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setRunning(false)
  }

  const activeResult = results[activeResultIdx]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 32,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        {running ? (
          <button
            onClick={handleCancelQuery}
            style={{
              height: 22,
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ⏹ Huỷ
          </button>
        ) : (
          <button
            onClick={handleRunQuery}
            style={{
              height: 22,
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ▶ {t.run}
          </button>
        )}

        <button
          className="hv-accent-border"
          style={{
            height: 22,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 4,
            color: 'var(--text2)',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {t.explain}
        </button>

        <button
          className="hv-accent-border"
          style={{
            height: 22,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            borderRadius: 4,
            color: 'var(--text2)',
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          {t.beautify}
        </button>

        <button
          className="hv-accent-soft-bg"
          onClick={goCompare}
          style={{
            height: 22,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--accent)',
            background: 'transparent',
            color: 'var(--accent)',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          ⇄ {t.captureSnap}
        </button>

        {activeResult && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
            {activeResult.durationMs} ms · {activeResult.rowCount} rows
          </span>
        )}
      </div>

      <div style={{ height: 240, flex: 'none', borderBottom: '1px solid var(--border-strong)' }}>
        <textarea
          value={sqlText}
          onChange={(e) => setSqlText(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            height: '100%',
            resize: 'none',
            border: 'none',
            outline: 'none',
            padding: '8px 12px',
            fontFamily: 'var(--mono)',
            fontSize: 12.5,
            lineHeight: 1.5,
            background: 'var(--pane)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div
        style={{
          height: 28,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '0 8px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={() => setActiveTab('results')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'results' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'results' ? 'var(--accent)' : 'var(--text2)',
            fontSize: 11,
            fontWeight: activeTab === 'results' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {t.result} ({results.length})
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'messages' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'messages' ? 'var(--accent)' : 'var(--text2)',
            fontSize: 11,
            fontWeight: activeTab === 'messages' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {t.messages}
        </button>

        {activeTab === 'results' && results.length > 1 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {results.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveResultIdx(idx)}
                style={{
                  height: 20,
                  padding: '0 6px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 3,
                  background: activeResultIdx === idx ? 'var(--accent)' : 'transparent',
                  color: activeResultIdx === idx ? 'var(--on-accent)' : 'var(--text2)',
                  fontSize: 10.5,
                  fontWeight: activeResultIdx === idx ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                Result #{idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'results' && activeResult && (
          activeResult.error ? (
            <div style={{ padding: 14, color: '#ef4444', fontFamily: 'var(--mono)', fontSize: 12 }}>
              Lỗi thực thi: {activeResult.error}
            </div>
          ) : (
            <DataGrid
              columns={activeResult.columns}
              rows={activeResult.rows}
              totalRows={activeResult.rowCount}
            />
          )
        )}

        {activeTab === 'messages' && (
          <div style={{ padding: 12, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {results.map((res, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                <div style={{ color: 'var(--text3)' }}>[Statement {i + 1}] {res.statement}</div>
                {res.error ? (
                  <div style={{ color: '#ef4444', marginTop: 2 }}>✕ Error: {res.error}</div>
                ) : (
                  <div style={{ color: '#4ade80', marginTop: 2 }}>
                    ✓ OK: {res.rowCount} row(s) affected / returned in {res.durationMs} ms
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
