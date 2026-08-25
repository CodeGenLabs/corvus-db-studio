import { useState, useRef, useEffect } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from '../components/useContextMenu'
import { ContextMenu } from '../components/ContextMenu'
import { DataGrid } from '../components/grid'
import { QueryHistoryPanel, type QueryHistoryEntry } from '../components/common/QueryHistoryPanel'
import { splitStatements } from '@corvus/sql'
import type { CellValue, ColumnDef, DialogId } from '@corvus/contract'

interface QueryTabResult {
  id: string
  name: string
  statement: string
  columns: ColumnDef[]
  rows: CellValue[][]
  rowCount: number
  durationMs: number
  isPinned?: boolean
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
  const [layoutMode, setLayoutMode] = useState<'bottom' | 'right'>('bottom')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<QueryTabResult[]>([])
  const [history, setHistory] = useState<QueryHistoryEntry[]>([])

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
    const newTabResults: QueryTabResult[] = []

    abortControllerRef.current = new AbortController()

    try {
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]!
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

          newTabResults.push({
            id: `res-${Date.now()}-${i}`,
            name: `Result ${results.filter((r) => r.isPinned).length + i + 1}`,
            statement: stmt,
            columns: cols.length > 0 ? cols : [{ name: 'result', type: 'TEXT', align: 't' }],
            rows: fetchedRows,
            rowCount: count || fetchedRows.length,
            durationMs: Date.now() - start,
            isPinned: false,
          })
        } catch (err) {
          newTabResults.push({
            id: `res-${Date.now()}-${i}`,
            name: `Result ${results.filter((r) => r.isPinned).length + i + 1}`,
            statement: stmt,
            columns: [],
            rows: [],
            rowCount: 0,
            durationMs: Date.now() - start,
            isPinned: false,
            error: (err as Error).message,
          })
        }
      }

      // Giữ lại các tab đã ghim
      const pinnedTabs = results.filter((r) => r.isPinned)
      const finalResults = [...pinnedTabs, ...newTabResults]

      setResults(finalResults)
      setActiveResultIdx(finalResults.length - newTabResults.length)
      setActiveSubTab('results')
    } finally {
      setRunning(false)
      abortControllerRef.current = null
    }
  }

  const handleTogglePin = (idx: number) => {
    setResults(
      results.map((r, i) => (i === idx ? { ...r, isPinned: !r.isPinned } : r)),
    )
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

  // 4. Sinh SQL bằng AI (Text-to-SQL) qua ai.generateSql
  const handleGenerateAiSql = async () => {
    if (!aiPrompt.trim()) return
    setAiGenerating(true)
    try {
      const res = await client.request<{ sql: string; explanation?: string }>('ai.generateSql', {
        prompt: aiPrompt,
        dialect: 'postgres',
      })
      if (res.sql) {
        setSqlText((prev) => `${prev}\n\n-- AI Generated:\n${res.sql}`)
        setShowAiModal(false)
        setAiPrompt('')
      }
    } catch (err) {
      alert(`Lỗi sinh SQL từ AI: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setAiGenerating(false)
    }
  }

  // 5. Tự sửa lỗi SQL bằng AI qua ai.fixSql
  const handleAiFix = async (badSql: string, errMsg: string) => {
    try {
      const res = await client.request<{ fixedSql: string; explanation?: string }>('ai.fixSql', {
        sql: badSql,
        error: errMsg,
        dialect: 'postgres',
      })
      if (res.fixedSql) {
        setSqlText(res.fixedSql)
      }
    } catch (err) {
      alert(`Lỗi AI Fix: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 6. Tải lịch sử query qua query.history.list
  useEffect(() => {
    async function loadHistory() {
      if (!client) return
      try {
        const list = await client.request<QueryHistoryEntry[]>('query.history.list', {})
        if (list && Array.isArray(list)) {
          setHistory(list)
        }
      } catch {
        // ignore
      }
    }
    loadHistory()
  }, [client, connectionId, activeSubTab])

  const activeResult = results[activeResultIdx]

  return (
    <div
      data-testid="sql-view"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Main Toolbar ── */}
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
            type="button"
            data-testid="btn-cancel-query"
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
            type="button"
            data-testid="btn-run-query"
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
          type="button"
          data-testid="btn-explain-query"
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
          type="button"
          data-testid="btn-format-query"
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
          type="button"
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
          type="button"
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

        {/* ── Layout Switcher: Bottom Split / Right Split ── */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            data-testid="btn-layout-bottom"
            title={t.layoutBottom}
            onClick={() => setLayoutMode('bottom')}
            style={{
              height: 22,
              padding: '0 6px',
              background: layoutMode === 'bottom' ? 'var(--pane)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: layoutMode === 'bottom' ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ⬒
          </button>
          <button
            type="button"
            data-testid="btn-layout-right"
            title={t.layoutRight}
            onClick={() => setLayoutMode('right')}
            style={{
              height: 22,
              padding: '0 6px',
              background: layoutMode === 'right' ? 'var(--pane)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: layoutMode === 'right' ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ◧
          </button>

          {activeResult && (
            <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
              {activeResult.durationMs} ms · {activeResult.rowCount} rows
            </span>
          )}
        </div>
      </div>

      {/* ── Editor & Results Split Container ── */}
      <div
        data-testid="sql-split-container"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: layoutMode === 'bottom' ? 'column' : 'row',
        }}
      >
        {/* Editor Pane */}
        <div
          data-testid="sql-editor-pane"
          style={{
            flex: 1,
            minHeight: layoutMode === 'bottom' ? 140 : '100%',
            minWidth: layoutMode === 'right' ? 240 : '100%',
            borderBottom: layoutMode === 'bottom' ? '1px solid var(--border-strong)' : 'none',
            borderRight: layoutMode === 'right' ? '1px solid var(--border-strong)' : 'none',
          }}
        >
          <textarea
            data-testid="sql-editor-textarea"
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            onContextMenu={(e) => {
              const hasSel = e.currentTarget.selectionEnd - e.currentTarget.selectionStart > 0
              openContextMenu(e, hasSel ? 'editor-selection' : 'empty')
            }}
            onKeyDown={(e) => {
              const hasSel = e.currentTarget.selectionEnd - e.currentTarget.selectionStart > 0
              handleKeyDown(e, hasSel ? 'editor-selection' : 'empty')
              if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
                e.preventDefault()
                handleRunQuery()
              }
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

        {/* Results / Messages / History Pane */}
        <div
          data-testid="sql-results-pane"
          style={{
            flex: 1,
            minHeight: layoutMode === 'bottom' ? 160 : '100%',
            minWidth: layoutMode === 'right' ? 240 : '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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
              type="button"
              data-testid="subtab-results"
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
              type="button"
              data-testid="subtab-messages"
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
              type="button"
              data-testid="subtab-history"
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

            {/* ── Multi-Result Tabs with Pin Action ── */}
            {activeSubTab === 'results' && results.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                {results.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    data-testid={`tab-result-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 22,
                      border: '1px solid var(--border-strong)',
                      borderRadius: 3,
                      background: activeResultIdx === idx ? 'var(--accent)' : 'transparent',
                      color: activeResultIdx === idx ? 'var(--on-accent)' : 'var(--text2)',
                      padding: '0 4px',
                      gap: 4,
                    }}
                  >
                    <span
                      onClick={() => setActiveResultIdx(idx)}
                      style={{
                        fontSize: 10.5,
                        fontWeight: activeResultIdx === idx ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {r.name || `Result #${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      data-testid={`btn-pin-result-${idx}`}
                      title={r.isPinned ? t.unpinTab : t.pinTab}
                      onClick={() => handleTogglePin(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: r.isPinned ? 'var(--amber)' : 'inherit',
                        cursor: 'pointer',
                        fontSize: 10,
                        padding: '0 2px',
                        opacity: r.isPinned ? 1 : 0.6,
                      }}
                    >
                      📌
                    </button>
                  </div>
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
                    type="button"
                    onClick={() => handleAiFix(activeResult.statement, activeResult.error || '')}
                    style={{
                      marginTop: 8,
                      padding: '4px 10px',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid #ef4444',
                      borderRadius: 4,
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    ✨ Sửa tự động bằng AI
                  </button>
                </div>
              ) : (
                <DataGrid
                  columns={activeResult.columns}
                  rows={activeResult.rows}
                  totalRows={activeResult.rowCount}
                  pageSize={100}
                  currentPage={1}
                />
              )
            )}

            {activeSubTab === 'messages' && (
              <div style={{ padding: 12, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text2)' }}>
                {results.map((r, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div>
                      [{i + 1}] {r.statement.slice(0, 80)}...
                    </div>
                    <div style={{ color: r.error ? '#ef4444' : 'var(--accent)' }}>
                      {r.error ? `Error: ${r.error}` : `OK — ${r.rowCount} rows in ${r.durationMs}ms`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeSubTab === 'history' && (
              <QueryHistoryPanel
                entries={history}
                onInsertSql={(querySql: string) => setSqlText(querySql)}
                onClear={() => { void handleClearHistory() }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal AI Generator */}
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
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
              ✨ Trợ lý AI — Viết SQL từ ngôn ngữ tự nhiên
            </h3>
            <textarea
              autoFocus
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="VD: Lấy danh sách 10 khách hàng chi tiêu nhiều nhất trong tháng qua..."
              style={{
                width: '100%',
                height: 90,
                padding: 8,
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--border-strong)',
                background: 'var(--pane2)',
                color: 'var(--text)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11.5,
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleGenerateAiSql}
                disabled={aiGenerating || !aiPrompt.trim()}
                style={{
                  padding: '5px 14px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11.5,
                }}
              >
                {aiGenerating ? 'Đang tạo SQL...' : 'Sinh câu lệnh SQL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Explain */}
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
              width: 600,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
              Kế hoạch thực thi truy vấn (Query Explain Plan)
            </h3>
            <pre
              style={{
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 10,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                color: 'var(--text)',
                lineHeight: 1.5,
                maxHeight: 250,
                overflow: 'auto',
              }}
            >
              {explainResult}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowExplainModal(false)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11.5,
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
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
