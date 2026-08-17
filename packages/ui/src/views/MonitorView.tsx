import { useState, useEffect } from 'react'

interface ProcessItem {
  id: string
  user: string
  host: string
  db: string
  command: string
  timeSec: number
  state: string
  info: string
}

export function MonitorView() {
  const [processes, setProcesses] = useState<ProcessItem[]>([
    { id: '104', user: 'root', host: 'localhost:54210', db: 'sakila', command: 'Query', timeSec: 2, state: 'executing', info: 'SELECT * FROM film JOIN inventory USING (film_id)' },
    { id: '105', user: 'app_user', host: '192.168.1.50:41200', db: 'sakila', command: 'Sleep', timeSec: 45, state: 'idle', info: '' },
    { id: '106', user: 'analytics', host: '192.168.1.51:38900', db: 'analytics', command: 'Query', timeSec: 14, state: 'Sending data', info: 'SELECT customer_id, SUM(amount) FROM payment GROUP BY customer_id' },
    { id: '107', user: 'backup_svc', host: '127.0.0.1:49112', db: 'sakila', command: 'Binlog Dump', timeSec: 1240, state: 'Master has sent all binlog to slave', info: '' },
  ])

  const [activeTab, setActiveTab] = useState<'processes' | 'status' | 'variables'>('processes')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [killCandidate, setKillCandidate] = useState<ProcessItem | null>(null)

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      setProcesses((prev) =>
        prev.map((p) => (p.command === 'Query' ? { ...p, timeSec: p.timeSec + 1 } : p)),
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleKill = (p: ProcessItem) => {
    setKillCandidate(p)
  }

  const handleConfirmKill = () => {
    if (killCandidate) {
      setProcesses((prev) => prev.filter((p) => p.id !== killCandidate.id))
      setKillCandidate(null)
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
          onClick={() => setActiveTab('processes')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'processes' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'processes' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeTab === 'processes' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Tiến trình ({processes.length})
        </button>

        <button
          onClick={() => setActiveTab('status')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'status' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'status' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeTab === 'status' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Chỉ số hiệu năng (Status)
        </button>

        <button
          onClick={() => setActiveTab('variables')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'variables' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'variables' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeTab === 'variables' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Biến hệ thống (Variables)
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Tự động làm mới (1s)</span>
          </label>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === 'processes' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--mono)' }}>
            <thead>
              <tr style={{ background: 'var(--pane2)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text2)' }}>
                <th style={{ padding: '6px 8px' }}>PID</th>
                <th style={{ padding: '6px 8px' }}>User</th>
                <th style={{ padding: '6px 8px' }}>Host</th>
                <th style={{ padding: '6px 8px' }}>Database</th>
                <th style={{ padding: '6px 8px' }}>Command</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Thời gian (s)</th>
                <th style={{ padding: '6px 8px' }}>Trạng thái</th>
                <th style={{ padding: '6px 8px' }}>Truy vấn (SQL)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.id} className="hv-row" style={{ borderBottom: '1px solid var(--grid-line)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--accent)', fontWeight: 600 }}>{p.id}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{p.user}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text3)' }}>{p.host}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{p.db}</td>
                  <td style={{ padding: '6px 8px', color: p.command === 'Query' ? '#eab308' : 'var(--text2)' }}>{p.command}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: p.timeSec > 10 ? '#ef4444' : 'var(--text)' }}>{p.timeSec}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text2)' }}>{p.state}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--text)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.info}>
                    {p.info || '—'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleKill(p)}
                      style={{
                        padding: '2px 6px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        background: 'transparent',
                        color: '#ef4444',
                        borderRadius: 3,
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      Dừng (Kill)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'status' && (
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Threads_connected', '8', 'Số kết nối hiện tại'],
              ['Threads_running', '2', 'Số luồng đang xử lý'],
              ['Queries', '1,429,812', 'Tổng số truy vấn đã thực thi'],
              ['Uptime', '42,190 s', 'Thời gian máy chủ hoạt động'],
              ['Innodb_buffer_pool_reads', '142', 'Số lần đọc đĩa buffer pool'],
              ['Bytes_received', '84.2 MB', 'Tổng dung lượng nhận'],
            ].map(([k, v, desc]) => (
              <div key={k} style={{ padding: 10, background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 6 }}>
                <div style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '4px 0' }}>{v}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text2)' }}>{desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'variables' && (
          <div style={{ padding: 12, fontFamily: 'var(--mono)', fontSize: 11.5 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['max_connections', '151'],
                  ['innodb_buffer_pool_size', '134217728 (128 MB)'],
                  ['wait_timeout', '28800'],
                  ['interactive_timeout', '28800'],
                  ['sql_mode', 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'],
                ].map(([k, v]) => (
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
