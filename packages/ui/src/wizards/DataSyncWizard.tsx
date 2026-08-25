import { useState, useEffect } from 'react'
import { WizardShell } from '../components/wizard/WizardShell'
import { useClient } from '../store/studio'
import type { ConnectionProfile } from '@corvus/contract'

export interface DataSyncWizardProps {
  onClose: () => void
  onComplete?: () => void
  initialSourceConnId?: string
}

const STEPS = [
  { id: 'connections', title: 'Nguồn & Đích (Source & Target)' },
  { id: 'compare', title: 'So sánh & Lựa chọn (Diff Review)' },
  { id: 'preview', title: 'Xem trước câu lệnh (SQL Preview)' },
  { id: 'execution', title: 'Đồng bộ (Execution)' },
]

export function DataSyncWizard({
  onClose,
  onComplete,
  initialSourceConnId,
}: DataSyncWizardProps) {
  const client = useClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [connections, setConnections] = useState<ConnectionProfile[]>([])
  const [sourceConnId, setSourceConnId] = useState(initialSourceConnId ?? '')
  const [targetConnId, setTargetConnId] = useState('')
  const [previewSql, setPreviewSql] = useState<string>(
    '-- SQL Đồng bộ dữ liệu tự động sinh:\nINSERT INTO target.customer (id, name) VALUES (101, \'Jane Doe\');\nUPDATE target.customer SET email = \'alice@example.com\' WHERE id = 12;\nDELETE FROM target.customer WHERE id = 99;',
  )
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string>('idle')
  const [jobLogs, setJobLogs] = useState<string[]>([])

  useEffect(() => {
    async function loadConnections() {
      if (!client) return
      try {
        const list = (await client.request('connection.list', {})) as ConnectionProfile[]
        setConnections(list)
        if (!sourceConnId && list.length > 0) {
          setSourceConnId(list[0]?.id ?? '')
        }
        if (list.length > 1) {
          setTargetConnId(list[1]?.id ?? '')
        }
      } catch {
        // fallback
      }
    }
    loadConnections()
  }, [client, sourceConnId])

  const handleStartSync = async () => {
    if (!client) return
    try {
      setJobStatus('running')
      const res = (await client.request('job.start', {
        kind: 'sync',
        name: ['Data Sync:', sourceConnId, '->', targetConnId].join(' '),
        config: {
          mode: 'data',
          sourceConnId,
          targetConnId,
          sql: previewSql,
        },
      })) as { jobId: string }

      if (res?.jobId) {
        setJobId(res.jobId)
        const stream = client.stream('job.log', { id: res.jobId })
        for await (const chunk of stream) {
          const text = typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
          setJobLogs((prev) => [...prev, text])
        }
        setJobStatus('completed')
        onComplete?.()
      }
    } catch (err) {
      setJobStatus('failed')
      setJobLogs((prev) => [...prev, `Lỗi: ${err instanceof Error ? err.message : String(err)}`])
    }
  }

  const handleCancelSync = async () => {
    if (!client || !jobId) return
    try {
      await client.request('job.cancel', { id: jobId })
      setJobStatus('cancelled')
      setJobLogs((prev) => [...prev, 'Đã huỷ tác vụ'])
    } catch {
      // fallback
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{ width: 740, height: 520 }}>
        <WizardShell
          title="Đồng bộ dữ liệu (Data Synchronization Wizard)"
          steps={STEPS}
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
          onCancel={onClose}
          onFinish={handleStartSync}
          isFinishDisabled={!sourceConnId || !targetConnId || sourceConnId === targetConnId}
        >
          {currentStep === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>
                  Kết nối nguồn (Source Connection):
                </label>
                <select
                  value={sourceConnId}
                  onChange={(e) => setSourceConnId(e.target.value)}
                  style={{
                    width: '100%',
                    height: 28,
                    padding: '0 8px',
                    background: 'var(--pane2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontSize: 11.5,
                  }}
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.driverId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>
                  Kết nối đích (Target Connection):
                </label>
                <select
                  value={targetConnId}
                  onChange={(e) => setTargetConnId(e.target.value)}
                  style={{
                    width: '100%',
                    height: 28,
                    padding: '0 8px',
                    background: 'var(--pane2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontSize: 11.5,
                  }}
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.driverId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>+1 dòng thêm mới</span>
                <span style={{ color: 'var(--amber)', fontWeight: 600 }}>~1 dòng cập nhật</span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>−1 dòng xoá</span>
              </div>
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8, fontSize: 11.5, fontFamily: 'var(--mono)' }}>
                <div>[+] customer (id=101, name="Jane Doe")</div>
                <div>[~] customer (id=12, email: "old@ex.com" → "alice@example.com")</div>
                <div>[-] customer (id=99, name="Deprecated")</div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              <div style={{ fontSize: 11.5, color: 'var(--text2)' }}>
                Xem trước các câu lệnh DML sẽ được thực thi trên máy chủ đích:
              </div>
              <textarea
                value={previewSql}
                onChange={(e) => setPreviewSql(e.target.value)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  background: 'var(--pane2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: 8,
                  color: 'var(--text)',
                  resize: 'none',
                }}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Trạng thái: <span style={{ color: 'var(--accent)' }}>{jobStatus.toUpperCase()}</span>
                </span>
                {jobStatus === 'running' && (
                  <button
                    onClick={handleCancelSync}
                    style={{
                      height: 24,
                      padding: '0 10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid #ef4444',
                      borderRadius: 4,
                      color: '#ef4444',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Huỷ (Cancel)
                  </button>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  background: 'var(--pane2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  overflow: 'auto',
                }}
              >
                {jobLogs.length === 0 ? (
                  <span style={{ color: 'var(--text3)' }}>Nhấp Bắt đầu để thực thi đồng bộ dữ liệu.</span>
                ) : (
                  jobLogs.map((log, idx) => <div key={idx}>{log}</div>)
                )}
              </div>
            </div>
          )}
        </WizardShell>
      </div>
    </div>
  )
}
