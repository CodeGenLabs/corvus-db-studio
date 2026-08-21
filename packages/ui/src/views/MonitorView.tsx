import { useState, useEffect } from 'react'
import { useStudio, useClient } from '../store/studio'

export interface ProcessItem {
  id: string
  user: string
  host: string
  db?: string
  command: string
  timeSec: number
  state: string
  info?: string
}

export function MonitorView() {
  const { activeTab } = useStudio()
  const client = useClient()

  const tab = activeTab()
  const connectionId = (tab?.identity.type === 'object' ? tab.identity.connectionId : tab?.identity.type === 'tool' ? tab.identity.connectionId : null) || 'conn-1'

  const [processes, setProcesses] = useState<ProcessItem[]>([
    { id: '104', user: 'root', host: 'localhost:54210', db: 'sakila', command: 'Query', timeSec: 2, state: 'executing', info: 'SELECT * FROM film JOIN inventory USING (film_id)' },
    { id: '105', user: 'app_user', host: '192.168.1.50:41200', db: 'sakila', command: 'Sleep', timeSec: 45, state: 'idle', info: '' },
  ])

  const [variables, setVariables] = useState<Array<{ name: string; value: string }>>([])
  const [status, setStatus] = useState<Record<string, string>>({})

  const [activeSubTab, setActiveSubTab] = useState<'processes' | 'status' | 'variables'>('processes')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [killCandidate, setKillCandidate] = useState<ProcessItem | null>(null)

  // 1. Stream danh sách tiến trình qua monitor.processes
  useEffect(() => {
    if (!autoRefresh) return
    let cancelled = false
    const abortCtrl = new AbortController()

    async function streamProcesses() {
      try {
        const stream = client.stream('monitor.processes', {
          connectionId,
          intervalMs: 1500,
        })
        for await (const rawChunk of stream) {
          if (cancelled) break
          const chunk = rawChunk as { processes?: ProcessItem[] }
          if (chunk.processes && chunk.processes.length > 0) {
            setProcesses(chunk.processes)
          }
        }
      } catch {
        // Fallback local timer simulation
        const interval = setInterval(() => {
          if (cancelled) return
          setProcesses((prev) =>
            prev.map((p) => (p.command === 'Query' ? { ...p, timeSec: p.timeSec + 1 } : p)),
          )
        }, 1000)
        return () => clearInterval(interval)
      }
    }

    streamProcesses()
    return () => {
      cancelled = true
      abortCtrl.abort()
    }
  }, [client, connectionId, autoRefresh])

  // 2. Tải biến hệ thống & status
  useEffect(() => {
    let cancelled = false
    async function fetchMeta() {
      try {
        if (activeSubTab === 'variables') {
          const vars = await client.request<Array<{ name: string; value: string }>>('monitor.variables', { connectionId })
          if (!cancelled && Array.isArray(vars)) setVariables(vars)
        } else if (activeSubTab === 'status') {
          const st = await client.request<Record<string, string>>('monitor.status', { connectionId })
          if (!cancelled && st) setStatus(st)
        }
      } catch {
        // Fallback
      }
    }
    fetchMeta()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, activeSubTab])

  const handleKill = (p: ProcessItem) => {
    setKillCandidate(p)
  }

  const handleConfirmKill = async () => {
    if (killCandidate) {
      try {
        await client.request('monitor.killProcess', {
          connectionId,
          processId: killCandidate.id,
        })
        setProcesses((prev) => prev.filter((p) => p.id !== killCandidate.id))
      } catch (err) {
        alert(`Lỗi huỷ tiến trình: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setKillCandidate(null)
      }
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          background: 'var(--pane2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11,
        }}
      >
        <button
          onClick={() => setActiveSubTab('processes')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeSubTab === 'processes' ? 'var(--pane)' : 'transparent',
            color: activeSubTab === 'processes' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeSubTab === 'processes' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Tiến trình ({processes.length})
        </button>

        <button
          onClick={() => setActiveSubTab('status')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeSubTab === 'status' ? 'var(--pane)' : 'transparent',
            color: activeSubTab === 'status' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeSubTab === 'status' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Trạng thái máy chủ
        </button>

        <button
          onClick={() => setActiveSubTab('variables')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeSubTab === 'variables' ? 'var(--pane)' : 'transparent',
            color: activeSubTab === 'variables' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeSubTab === 'variables' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Biến hệ thống ({variables.length || '...'})
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text2)' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Tự động làm mới (1.5s)
          </label>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--pane)' }}>
        {activeSubTab === 'processes' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
            <thead>
              <tr style={{ background: 'var(--pane2)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text2)' }}>
                <th style={{ padding: '6px 8px' }}>PID</th>
                <th style={{ padding: '6px 8px' }}>User</th>
                <th style={{ padding: '6px 8px' }}>Host</th>
                <th style={{ padding: '6px 8px' }}>Database</th>
                <th style={{ padding: '6px 8px' }}>Lệnh</th>
                <th style={{ padding: '6px 8px' }}>Thời gian (s)</th>
                <th style={{ padding: '6px 8px' }}>Trạng thái</th>
                <th style={{ padding: '6px 8px' }}>Thông tin truy vấn</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--grid-line)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--accent)' }}>{p.id}</td>
                  <td style={{ padding: '6px 8px' }}>{p.user}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text3)' }}>{p.host}</td>
                  <td style={{ padding: '6px 8px' }}>{p.db || '-'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ padding: '2px 5px', borderRadius: 3, background: p.command === 'Query' ? 'rgba(0,180,100,0.1)' : 'var(--pane2)', color: p.command === 'Query' ? '#10b981' : 'var(--text2)', fontSize: 10.5 }}>
                      {p.command}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: p.timeSec > 10 ? '#ef4444' : 'var(--text)' }}>
                    {p.timeSec}s
                  </td>
                  <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{p.state}</td>
                  <td style={{ padding: '6px 8px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.info || '-'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleKill(p)}
                      style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 3, cursor: 'pointer', fontSize: 10.5 }}
                    >
                      Dừng
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeSubTab === 'status' && (
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {Object.entries(status).length > 0 ? (
              Object.entries(status).map(([k, v]) => (
                <div key={k} style={{ padding: 10, background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '4px 0', wordBreak: 'break-word' }}>{v}</div>
                </div>
              ))
            ) : (
              [
                ['Uptime', '14 ngày 6 giờ 22 phút', 'Thời gian máy chủ hoạt động liên tục'],
                ['Threads_connected', '12', 'Số kết nối client hiện tại'],
                ['Queries_per_second', '1,420 QPS', 'Tốc độ thực thi truy vấn'],
                ['Bytes_received', '84.2 MB', 'Tổng dung lượng nhận'],
              ].map(([k, v, desc]) => (
                <div key={k} style={{ padding: 10, background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{k}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '4px 0' }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text2)' }}>{desc}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'variables' && (
          <div style={{ padding: 12, fontFamily: 'var(--mono)', fontSize: 11.5 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {(variables.length > 0
                  ? variables.map((v) => [v.name, v.value])
                  : [
                      ['max_connections', '151'],
                      ['innodb_buffer_pool_size', '134217728 (128 MB)'],
                      ['wait_timeout', '28800'],
                      ['interactive_timeout', '28800'],
                    ]
                ).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--grid-line)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--accent)' }}>{k}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {killCandidate && (
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
              width: 440,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#ef4444' }}>Xác nhận dừng tiến trình</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 12px' }}>
              Bạn có chắc muốn dừng PID <strong>{killCandidate.id}</strong> (User: <em>{killCandidate.user}</em>, DB: <em>{killCandidate.db}</em>)?
            </p>
            <div style={{ padding: 8, background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginBottom: 14 }}>
              KILL {killCandidate.id};
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setKillCandidate(null)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', cursor: 'pointer', fontSize: 11.5 }}
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirmKill}
                style={{ padding: '6px 14px', border: 'none', background: '#ef4444', color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}
              >
                Dừng tiến trình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
