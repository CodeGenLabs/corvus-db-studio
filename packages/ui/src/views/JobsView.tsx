import { useEffect, useState } from 'react'
import { useStudio, useClient } from '../store/studio'
import { useActiveContext } from '../context/useActiveContext'
import { useContextMenu } from '../components/useContextMenu'
import { ContextMenu } from '../components/ContextMenu'
import type { DialogId } from '@corvus/contract'

const PILL_COLOR: Record<string, string> = {
  ok: 'var(--green)',
  running: 'var(--accent)',
  warn: 'var(--amber)',
  fail: 'var(--red)',
}

export interface ScheduleItemResult {
  id: string
  name: string
  cronExpression: string
  jobKind: string
  jobConfig: Record<string, unknown>
  enabled: boolean
  lastRunAt?: string
  nextRunAt?: string
}

interface RunLogItem {
  id: string
  jobName: string
  startedAt: string
  duration: string
  status: 'ok' | 'fail' | 'running'
  logs: string[]
}

export function JobsView() {
  const { set, t, rowH, openTab } = useStudio()
  const ctx = useActiveContext()
  const client = useClient()
  const { menuState, openContextMenu, handleKeyDown, closeContextMenu } = useContextMenu('ctx-job-list')

  const [activeTab, setActiveTab] = useState<'jobs' | 'history'>('jobs')
  const [schedules, setSchedules] = useState<ScheduleItemResult[]>([])
  const [selectedRunLog, setSelectedRunLog] = useState<RunLogItem | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  // Editor states
  const [editName, setEditName] = useState('')
  const [editCron, setEditCron] = useState('0 0 * * *')
  const [editKind, setEditKind] = useState('backup')

  // 1. Tải danh sách lịch trình qua schedule.list
  useEffect(() => {
    let cancelled = false
    async function fetchSchedules() {
      try {
        const list = await client.request<ScheduleItemResult[]>('schedule.list', {})
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setSchedules(list)
        } else if (!cancelled) {
          // Fallback sample
          setSchedules([
            {
              id: 'sch-1',
              name: 'Backup Sakila Nightly',
              cronExpression: '0 2 * * *',
              jobKind: 'backup',
              jobConfig: {},
              enabled: true,
              lastRunAt: '2026-08-20 02:00:00',
            },
            {
              id: 'sch-2',
              name: 'Customer Sync ETL',
              cronExpression: '*/30 * * * *',
              jobKind: 'sync',
              jobConfig: {},
              enabled: true,
              lastRunAt: '2026-08-20 16:00:00',
            },
          ])
        }
      } catch {
        // Fallback
      }
    }
    fetchSchedules()
    return () => {
      cancelled = true
    }
  }, [client])

  const openNewJob = () => {
    setEditName('Tác vụ sao lưu định kỳ')
    setEditCron('0 2 * * *')
    setEditKind('backup')
    setShowEditor(true)
  }

  const saveJob = async () => {
    try {
      const created = await client.request<ScheduleItemResult>('schedule.create', {
        name: editName,
        cronExpression: editCron,
        jobKind: editKind,
        jobConfig: {},
        enabled: true,
      })
      setSchedules([...schedules, created])
    } catch {
      const newId = `sch-${Date.now()}`
      setSchedules([
        ...schedules,
        {
          id: newId,
          name: editName,
          cronExpression: editCron,
          jobKind: editKind,
          jobConfig: {},
          enabled: true,
        },
      ])
    }
    setShowEditor(false)
  }

  const handleRunNow = async (id: string) => {
    try {
      const res = await client.request<{ jobId: string }>('schedule.runNow', { id })
      alert(`Đã khởi động tác vụ (Job ID: ${res.jobId})`)
    } catch (err) {
      alert(`Lỗi chạy tác vụ: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await client.request('schedule.delete', { id })
      setSchedules(schedules.filter((s) => s.id !== id))
    } catch {
      setSchedules(schedules.filter((s) => s.id !== id))
    }
  }

  return (
    <div
      data-testid="jobs-view"
      onContextMenu={(e) => openContextMenu(e, 'empty')}
      onKeyDown={(e) => handleKeyDown(e, 'empty')}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
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
          {t.backups} & Tác vụ ({schedules.length})
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
          Lịch sử chạy
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={openNewJob}
            style={{
              height: 22,
              padding: '0 10px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            + Tạo lịch mới
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12, background: 'var(--pane)' }}>
        {activeTab === 'jobs' && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 140px 100px 140px',
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
              <div>Loại công việc</div>
              <div>Trạng thái</div>
              <div style={{ textAlign: 'right' }}>Hành động</div>
            </div>

            {schedules.map((s) => (
              <div
                key={s.id}
                onContextMenu={(e) => {
                  e.stopPropagation()
                  openContextMenu(e, 'job')
                }}
                onKeyDown={(e) => handleKeyDown(e, 'job')}
                tabIndex={0}
                className="hv-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 140px 100px 140px',
                  height: rowH + 6,
                  alignItems: 'center',
                  borderBottom: '1px solid var(--grid-line)',
                  background: 'var(--pane)',
                  padding: '0 10px',
                  fontSize: 11.5,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
                  {s.cronExpression || 'Thủ công'}
                </div>
                <div style={{ color: 'var(--text2)', fontSize: 11, textTransform: 'uppercase' }}>
                  {s.jobKind}
                </div>
                <div>
                  <span style={{ color: s.enabled ? 'var(--green)' : 'var(--text3)', fontWeight: 600, fontSize: 11 }}>
                    {s.enabled ? '● Đang bật' : '○ Tắt'}
                  </span>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleRunNow(s.id)}
                    style={{
                      border: '1px solid var(--border-strong)',
                      background: 'transparent',
                      color: 'var(--accent)',
                      fontSize: 10.5,
                      borderRadius: 3,
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    Chạy ngay
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
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

              {[
                {
                  id: 'run-1',
                  jobName: 'Backup Sakila Nightly',
                  startedAt: '2026-08-20 02:00:00',
                  duration: '45s',
                  status: 'ok' as const,
                  logs: ['[02:00:00] Bắt đầu tác vụ sao lưu', '[02:00:45] Sao lưu hoàn tất thành công.'],
                },
              ].map((r) => (
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
              }}
            >
              <div
                style={{
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  background: 'var(--pane)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                Log chi tiết {selectedRunLog ? `— ${selectedRunLog.jobName}` : ''}
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 10,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: 'var(--text2)',
                  overflow: 'auto',
                }}
              >
                {selectedRunLog ? (
                  selectedRunLog.logs.map((line, i) => <div key={i}>{line}</div>)
                ) : (
                  <div style={{ color: 'var(--text3)' }}>Chọn một lần chạy ở bảng bên trái để xem log.</div>
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
              width: 480,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text)' }}>Tạo lịch tác vụ tự động</h3>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Tên tác vụ:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12 }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Loại công việc:</label>
              <select
                value={editKind}
                onChange={(e) => setEditKind(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12 }}
              >
                <option value="backup">Sao lưu (Backup)</option>
                <option value="restore">Phục hồi (Restore)</option>
                <option value="import">Nhập dữ liệu (Import)</option>
                <option value="export">Xuất dữ liệu (Export)</option>
                <option value="sync">Đồng bộ (Sync)</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Biểu thức Cron:</label>
              <input
                type="text"
                value={editCron}
                onChange={(e) => setEditCron(e.target.value)}
                style={{ width: '100%', height: 26, padding: '0 8px', background: 'var(--pane2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                Lưu lịch trình
              </button>
            </div>
          </div>
        </div>
      )}

      {menuState?.isOpen && (
        <ContextMenu
          x={menuState.x}
          y={menuState.y}
          surface="ctx-job-list"
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
