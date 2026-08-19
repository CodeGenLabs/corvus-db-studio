import { useState } from 'react'
import { selectValue } from '../utils/select-value'
import { useStudio } from '../store/studio'
import type { BatchJobDef, BatchJobStep } from '@corvus/contract'

const PILL_COLOR: Record<string, string> = {
  ok: 'var(--green)',
  running: 'var(--accent)',
  warn: 'var(--amber)',
  fail: 'var(--red)',
}

const INITIAL_JOBS: BatchJobDef[] = [
  {
    id: 'job-1',
    name: 'Backup Sakila Nightly',
    schedule: { id: 'sch-1', jobId: 'job-1', cron: '0 2 * * *', timezone: 'UTC', enabled: true },
    steps: [
      { id: 's1', kind: 'backup', name: 'Backup Sakila DB', payload: {} },
      { id: 's2', kind: 'batch', name: 'VACUUM & ANALYZE', payload: {} },
    ],
  },
  {
    id: 'job-2',
    name: 'Customer Sync ETL',
    schedule: { id: 'sch-2', jobId: 'job-2', cron: '*/30 * * * *', timezone: 'Asia/Ho_Chi_Minh', enabled: true },
    steps: [
      { id: 's1', kind: 'import', name: 'Import CSV updates', payload: {} },
      { id: 's2', kind: 'export', name: 'Export reporting snapshot', payload: {} },
    ],
  },
]

interface RunLogItem {
  id: string
  jobName: string
  startedAt: string
  duration: string
  status: 'ok' | 'fail' | 'running'
  logs: string[]
}

const RUN_LOGS: RunLogItem[] = [
  {
    id: 'run-101',
    jobName: 'Backup Sakila Nightly',
    startedAt: '2026-08-17 02:00:00',
    duration: '1m 24s',
    status: 'ok',
    logs: [
      '[02:00:00] [INFO] Starting job "Backup Sakila Nightly"',
      '[02:00:01] [INFO] Executing Step 1: Backup Sakila DB...',
      '[02:00:45] [INFO] Backup created: sakila_20260817.sql.gz (18.4 MB)',
      '[02:00:46] [INFO] Executing Step 2: VACUUM & ANALYZE...',
      '[02:01:24] [SUCCESS] All steps completed successfully.',
    ],
  },
  {
    id: 'run-102',
    jobName: 'Customer Sync ETL',
    startedAt: '2026-08-17 16:00:00',
    duration: '45s',
    status: 'ok',
    logs: [
      '[16:00:00] [INFO] Starting job "Customer Sync ETL"',
      '[16:00:01] [INFO] Step 1: Importing 1,420 rows from customers_delta.csv...',
      '[16:00:20] [INFO] 1,420 rows inserted into staging_customer.',
      '[16:00:21] [INFO] Step 2: Exporting reporting snapshot...',
      '[16:00:45] [SUCCESS] Export finished: report_snapshot.parquet.',
    ],
  },
]

export function JobsView() {
  const { t, rowH } = useStudio()
  const [activeTab, setActiveTab] = useState<'jobs' | 'history'>('jobs')
  const [jobs, setJobs] = useState<BatchJobDef[]>(INITIAL_JOBS)
  const [selectedRunLog, setSelectedRunLog] = useState<RunLogItem | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // Editor states
  const [editName, setEditName] = useState('')
  const [editCron, setEditCron] = useState('0 0 * * *')
  const [editSteps, setEditSteps] = useState<BatchJobStep[]>([])

  const openNewJob = () => {
    setEditName('Tác vụ mới')
    setEditCron('0 2 * * *')
    setEditSteps([{ id: 's1', kind: 'backup', name: 'Sao lưu DB', payload: {} }])
    setShowEditor(true)
  }

  const saveJob = () => {
    const newId = `job-${Date.now()}`
    const newJob: BatchJobDef = {
      id: newId,
      name: editName,
      schedule: { id: `sch-${Date.now()}`, jobId: newId, cron: editCron, timezone: 'UTC', enabled: true },
      steps: editSteps,
    }
    setJobs([...jobs, newJob])
    setShowEditor(false)
  }

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
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'jobs' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'jobs' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeTab === 'jobs' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {t.backups} ({jobs.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            height: 22,
            padding: '0 8px',
            border: 'none',
            borderRadius: 3,
            background: activeTab === 'history' ? 'var(--pane)' : 'transparent',
            color: activeTab === 'history' ? 'var(--accent)' : 'var(--text2)',
            fontWeight: activeTab === 'history' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {t.recentRuns} ({RUN_LOGS.length})
        </button>

        {activeTab === 'jobs' && (
          <button
            onClick={openNewJob}
            style={{
              marginLeft: 'auto',
              height: 22,
              padding: '0 8px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Thêm tác vụ (New Batch Job)
          </button>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12 }}>
        {activeTab === 'jobs' && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 180px 100px 100px',
                height: 28,
                alignItems: 'center',
                background: 'var(--pane2)',
                borderBottom: '1px solid var(--border)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text2)',
                padding: '0 10px',
              }}
            >
              <div>Tên tác vụ</div>
              <div>Lịch chạy (Cron)</div>
              <div>Các bước (Steps)</div>
              <div>Trạng thái</div>
              <div style={{ textAlign: 'right' }}>Hành động</div>
            </div>

            {jobs.map((j) => (
              <div
                key={j.id}
                className="hv-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 180px 100px 100px',
                  height: rowH + 6,
                  alignItems: 'center',
                  borderBottom: '1px solid var(--grid-line)',
                  background: 'var(--pane)',
                  padding: '0 10px',
                  fontSize: 11.5,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{j.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
                  {j.schedule?.cron || 'Thủ công'}
                </div>
                <div style={{ color: 'var(--text2)', fontSize: 11 }}>
                  {j.steps.map((s) => s.kind).join(' ➔ ')}
                </div>
                <div>
                  <span style={{ color: j.schedule?.enabled ? 'var(--green)' : 'var(--text3)', fontWeight: 600, fontSize: 11 }}>
                    {j.schedule?.enabled ? '● Đang bật' : '○ Tắt'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => setJobs(jobs.filter((x) => x.id !== j.id))}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{ display: 'flex', gap: 12, height: '100%' }}>
            <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--pane)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px 100px 80px',
                  height: 28,
                  alignItems: 'center',
                  background: 'var(--pane2)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text2)',
                  padding: '0 10px',
                }}
              >
                <div>Tác vụ</div>
                <div>Thời gian bắt đầu</div>
                <div>Thời lượng</div>
                <div>Kết quả</div>
              </div>

              {RUN_LOGS.map((r) => (
                <div
                  key={r.id}
                  className="hv-row"
                  onClick={() => setSelectedRunLog(r)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 150px 100px 80px',
                    height: rowH + 4,
                    alignItems: 'center',
                    borderBottom: '1px solid var(--grid-line)',
                    background: selectedRunLog?.id === r.id ? 'var(--accent-soft)' : 'transparent',
                    cursor: 'pointer',
                    padding: '0 10px',
                    fontSize: 11.5,
                  }}
                >
                  <div style={{ fontWeight: 500, color: 'var(--text)' }}>{r.jobName}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{r.startedAt}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>{r.duration}</div>
                  <div>
                    <span style={{ color: PILL_COLOR[r.status], fontWeight: 600, fontSize: 11 }}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Run Log Viewer */}
            <div
              style={{
                width: 380,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--pane2)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 11, color: 'var(--text2)' }}>
                📜 Nhật ký thực thi (Execution Log)
              </div>
              <div style={{ flex: 1, padding: 8, overflow: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', background: 'var(--pane)' }}>
                {selectedRunLog ? (
                  selectedRunLog.logs.map((line, idx) => (
                    <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid var(--grid-line)' }}>
                      {line}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text3)', padding: 10 }}>Chọn một lượt chạy để xem nhật ký chi tiết</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showEditor && (
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
              width: 520,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--text)' }}>Thiết lập tác vụ tự động (Batch Job Editor)</h3>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên tác vụ:</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 11.5 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Lịch biểu chạy (Cron Builder):</label>
              <input
                value={editCron}
                onChange={(e) => setEditCron(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11.5 }}
              />
              <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 4 }}>
                ℹ Biểu thức 5 trường: phút giờ ngày tháng thứ (ví dụ: `0 2 * * *` chạy vào 02:00 mỗi đêm)
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text2)' }}>Các bước thực hiện ({editSteps.length}):</label>
                <button
                  onClick={() => setEditSteps([...editSteps, { id: `s-${Date.now()}`, kind: 'batch', name: 'SQL Command', payload: {} }])}
                  style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }}
                >
                  + Thêm bước
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {editSteps.map((st, i) => (
                  <div key={st.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={st.kind}
                      onChange={(e) => {
                        const next = [...editSteps]
                        next[i] = { ...st, kind: selectValue(e.target.value, ['backup', 'import', 'export', 'batch', 'transfer', 'sync'], 'batch') }
                        setEditSteps(next)
                      }}
                      style={{ height: 24, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', fontSize: 11 }}
                    >
                      <option value="backup">Sao lưu (Backup)</option>
                      <option value="import">Nhập dữ liệu (Import)</option>
                      <option value="export">Xuất dữ liệu (Export)</option>
                      <option value="batch">Tác vụ Batch</option>
                      <option value="transfer">Chuyển dữ liệu (Transfer)</option>
                      <option value="sync">Đồng bộ (Sync)</option>
                    </select>
                    <input
                      value={st.name}
                      onChange={(e) => {
                        const next = [...editSteps]
                        next[i] = { ...st, name: e.target.value }
                        setEditSteps(next)
                      }}
                      style={{ flex: 1, height: 24, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text)', fontSize: 11 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setShowEditor(false)}
                style={{ padding: '6px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', cursor: 'pointer', fontSize: 11.5 }}
              >
                Huỷ
              </button>
              <button
                onClick={saveJob}
                style={{ padding: '6px 14px', border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 4, cursor: 'pointer', fontSize: 11.5, fontWeight: 600 }}
              >
                Lưu tác vụ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
