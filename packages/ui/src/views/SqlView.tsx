import { useState, useRef, useEffect } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from '../components/useContextMenu'
import { ContextMenu } from '../components/ContextMenu'
import { DataGrid } from '../components/grid'
import { QueryHistoryPanel } from '../components/common/QueryHistoryPanel'
import { splitStatements } from '@corvus/sql'
import type { CellValue, ColumnDef, DialogId } from '@corvus/contract'

interface QueryTabResult {
  statement: string
  columns: ColumnDef[]
  rows: CellValue[][]
  rowCount: number
  durationMs: number
  error?: string
}

export function SqlView() {
  const { set, t, setView, openTab, activeTab: getActiveTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const goCompare = setView('compare')
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-sql-editor')

  const tab = getActiveTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'

  const [sqlText, setSqlText] = useState(
    `-- Corvus DB Studio SQL Editor\nSELECT customer_id, first_name, last_name, email, active\nFROM customer\nWHERE active = 1\nORDER BY customer_id ASC\nLIMIT 20;`,
  )

  const [activeSubTab, setActiveSubTab] = useState<'results' | 'messages' | 'history'>('results')
  const [activeResultIdx, setActiveResultIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<QueryTabResult[]>([])
  const [history, setHistory] = useState<Array<{ id: string; sql: string; executedAt: string; durationMs: number; status: string }>>([])

  // Modal AI Assistant
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  // Modal Explain
  const [showExplainModal, setShowExplainModal] = useState(false)
  const [explainResult, setExplainResult] = useState<string>('')

  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Chạy câu lệnh SQL
  const handleRunQuery = async () => {
    setRunning(true)
    handleParseSql()
    const statements = splitStatements(sqlText, 'postgres').filter((s) => s.trim().length > 0)
    const nextResults: QueryTabResult[] = []

    abortControllerRef.current = new AbortController()

    try {
      for (const stmt of statements) {
        const start = Date.now()
        try {
          const stream = client.stream('query.execute', {
            sql: stmt,
            connectionId,
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
      setActiveSubTab('results')
    } finally {
      setRunning(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelQuery = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (client && connectionId) {
      try {
        await client.request('query.cancel', { queryId: connectionId })
      } catch {
        // ignore
      }
    }
    setRunning(false)
  }

  const handleParseSql = async () => {
    if (!client) return
    try {
      await client.request('query.parse', { sql: sqlText, dialect: 'postgres' })
    } catch {
      // ignore
    }
  }

  const handleClearHistory = async () => {
    if (client) {
      try {
        await client.request('query.history.clear', {})
        setHistory([])
      } catch {
        // ignore
      }
    }
  }

  // 2. Format SQL qua query.format
  const handleFormatSql = async () => {
    try {
      const res = await client.request<{ formatted: string }>('query.format', {
        sql: sqlText,
        dialect: 'postgres',
      })
      if (res.formatted) setSqlText(res.formatted)
    } catch {
      // ignore
    }
  }

  // 3. Explain Plan qua query.explain và ai.explainPlan
  const handleExplain = async () => {
    setRunning(true)
    try {
      const res = await client.request<{ plan: unknown; raw?: string }>('query.explain', {
        connectionId,
        sql: sqlText.trim(),
      })
      const planStr = JSON.stringify(res.plan, null, 2)
      setExplainResult(planStr)
      setShowExplainModal(true)
      try {
        await client.request('ai.explainPlan', {
          plan: planStr,
          dialect: 'postgres',
        })
      } catch {
        // optional AI enhancement
      }
    } catch (err) {
      alert(`Lỗi Explain: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
    }
  }

  // 4. AI Generate SQL
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return
    setAiGenerating(true)
    try {
      const res = await client.request<{ sql: string; explanation?: string }>('ai.generateSql', {
        prompt: aiPrompt,
        dialect: 'postgres',
      })
      setSqlText(res.sql)
      setShowAiModal(false)
    } catch (err) {
      alert(`Lỗi AI: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setAiGenerating(false)
    }
  }

  // 5. AI Fix SQL khi có lỗi
  const handleAiFix = async (errStmt: string, errorMsg: string) => {
    try {
      const res = await client.request<{ fixedSql: string; explanation: string }>('ai.fixSql', {
        sql: errStmt,
        error: errorMsg,
        dialect: 'postgres',
      })
      setSqlText(res.fixedSql)
      alert(`AI đã sửa SQL: ${res.explanation}`)
    } catch (err) {
      alert(`Lỗi AI Fix: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 6. Tải lịch sử truy vấn
  useEffect(() => {
    if (activeSubTab !== 'history') return
    async function loadHistory() {
      try {
        const hist = await client.request<Array<{ id: string; sql: string; executedAt: string; durationMs: number; status: string }>>(
          'query.history.list',
          { connectionId, limit: 50 },
        )
        if (Array.isArray(hist)) setHistory(hist)
      } catch {
        // Fallback
      }
    }
    loadHistory()
  }, [client, connectionId, activeSubTab])

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
          onClick={handleExplain}
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
          onClick={handleFormatSql}
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
          onClick={() => setShowAiModal(true)}
          style={{
            height: 22,
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            border: '1px solid var(--accent)',
            background: 'rgba(99,102,241,0.1)',
            color: 'var(--accent)',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          ✨ Trợ lý AI (Text-to-SQL)
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
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text2)',
            borderRadius: 4,
            cursor: 'pointer',
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
          onContextMenu={(e) => {
            const hasSel = (e.currentTarget.selectionEnd - e.currentTarget.selectionStart) > 0
            openContextMenu(e, hasSel ? 'editor-selection' : 'empty')
          }}
          onKeyDown={(e) => {
            const hasSel = (e.currentTarget.selectionEnd - e.currentTarget.selectionStart) > 0
            handleKeyDown(e, hasSel ? 'editor-selection' : 'empty')
          }}
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
          onClick={() => setActiveSubTab('results')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeSubTab === 'results' ? 'var(--pane)' : 'transparent',
            color: activeSubTab === 'results' ? 'var(--accent)' : 'var(--text2)',
            fontSize: 11,
            fontWeight: activeSubTab === 'results' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {t.result} ({results.length})
        </button>

        <button
          onClick={() => setActiveSubTab('messages')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeSubTab === 'messages' ? 'var(--pane)' : 'transparent',
            color: activeSubTab === 'messages' ? 'var(--accent)' : 'var(--text2)',
            fontSize: 11,
            fontWeight: activeSubTab === 'messages' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {t.messages}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeSubTab === 'history' ? 'var(--pane)' : 'transparent',
            color: activeSubTab === 'history' ? 'var(--accent)' : 'var(--text2)',
            fontSize: 11,
            fontWeight: activeSubTab === 'history' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Lịch sử ({history.length})
        </button>

        {activeSubTab === 'results' && results.length > 1 && (
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
        {activeSubTab === 'results' && activeResult && (
          activeResult.error ? (
            <div style={{ padding: 14, color: '#ef4444', fontFamily: 'var(--mono)', fontSize: 12 }}>
              <div>✕ Lỗi thực thi: {activeResult.error}</div>
              <button
                onClick={() => handleAiFix(activeResult.statement, activeResult.error || '')}
                style={{
                  marginTop: 10,
                  padding: '4px 10px',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                ✨ Nhờ AI tự động sửa câu lệnh này
              </button>
            </div>
          ) : (
            <DataGrid
              columns={activeResult.columns}
              rows={activeResult.rows}
              totalRows={activeResult.rowCount}
            />
          )
        )}

        {activeSubTab === 'messages' && (
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

        {activeSubTab === 'history' && (
          <QueryHistoryPanel
            entries={history.map((h) => ({
              id: h.id,
              sql: h.sql,
              executedAt: h.executedAt,
              durationMs: h.durationMs,
              status: h.status === 'error' ? 'error' : 'success',
            }))}
            onInsertSql={(sql) => setSqlText(sql)}
            onClear={handleClearHistory}
          />
        )}
      </div>

      {/* Modal AI Generate */}
      {showAiModal && (
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
              width: 500,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text)' }}>✨ Trợ lý AI Text-to-SQL</h3>
            <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--text2)' }}>
              Nhập yêu cầu bằng ngôn ngữ tự nhiên để AI tự động sinh câu truy vấn SQL:
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ví dụ: Lấy danh sách 10 khách hàng có tổng chi tiêu cao nhất trong tháng này..."
              style={{
                width: '100%',
                height: 80,
                padding: 8,
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text)',
                fontSize: 12,
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', cursor: 'pointer', fontSize: 11.5 }}
              >
                Huỷ
              </button>
              <button
                disabled={aiGenerating}
                onClick={handleAiGenerate}
                style={{ padding: '6px 14px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}
              >
                {aiGenerating ? 'Đang tạo...' : 'Sinh câu lệnh SQL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Explain Plan */}
      {showExplainModal && (
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
              width: 580,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text)' }}>Kế hoạch thực thi (EXPLAIN Plan)</h3>
            <pre
              style={{
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 12,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                color: 'var(--text)',
                lineHeight: 1.5,
                maxHeight: 280,
                overflow: 'auto',
              }}
            >
              {explainResult}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setShowExplainModal(false)}
                style={{ padding: '6px 14px', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text)', borderRadius: 4, cursor: 'pointer', fontSize: 11.5 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-sql-editor"
          targetKind={menuState.targetKind}
          activeContext={ctx}
          commandContext={{
            active: ctx,
            client,
            openTab,
            openDialog: (d) => set({ dialog: d as DialogId }),
          }}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
