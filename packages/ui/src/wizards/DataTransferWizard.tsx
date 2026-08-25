import { useState, useEffect } from 'react'
import { WizardShell } from '../components/wizard/WizardShell'
import { useClient } from '../store/studio'
import type { ConnectionProfile } from '@corvus/contract'

export interface DataTransferWizardProps {
  onClose: () => void
  onComplete?: () => void
  initialSourceConnId?: string
}

const STEPS = [
  { id: 'connections', title: 'Nguồn & Đích (Source & Target)' },
  { id: 'objects', title: 'Đối tượng chuyển (Objects)' },
  { id: 'options', title: 'Tuỳ chọn chuyển (Options)' },
  { id: 'progress', title: 'Tiến trình (Progress)' },
]

export function DataTransferWizard({
  onClose,
  onComplete,
  initialSourceConnId,
}: DataTransferWizardProps) {
  const client = useClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [connections, setConnections] = useState<ConnectionProfile[]>([])
  const [sourceConnId, setSourceConnId] = useState(initialSourceConnId ?? '')
  const [targetConnId, setTargetConnId] = useState('')
  const [transferMode, setTransferMode] = useState<'structure_and_data' | 'structure_only' | 'data_only'>('structure_and_data')
  const [selectedTables, setSelectedTables] = useState<string[]>(['customer', 'film', 'actor'])
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

  const handleStartTransfer = async () => {
    if (!client) return
    try {
      setJobStatus('running')
      const res = (await client.request('job.start', {
        kind: 'transfer',
        name: ['Data Transfer:', sourceConnId, '->', targetConnId].join(' '),
        config: {
          sourceConnId,
          targetConnId,
          tables: selectedTables,
          mode: transferMode,
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

  const handleCancelTransfer = async () => {
    if (!client || !jobId) return
    try {
      await client.request('job.cancel', { id: jobId })
      setJobStatus('cancelled')
      setJobLogs((prev) => [...prev, 'Đã gửi yêu cầu huỷ tác vụ'])
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
      <div style={{ width: 720, height: 500 }}>
        <WizardShell
          title="Chuyển dữ liệu giữa các máy chủ (Data Transfer Wizard)"
          steps={STEPS}
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
          onCancel={onClose}
          onFinish={handleStartTransfer}
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
              <h4 style={{ margin: 0, fontSize: 12.5 }}>Chọn các bảng cần chuyển:</h4>
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
                {['customer', 'film', 'actor', 'rental', 'payment', 'inventory'].map((tbl) => (
                  <label key={tbl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11.5 }}>
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(tbl)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTables([...selectedTables, tbl])
                        else setSelectedTables(selectedTables.filter((t) => t !== tbl))
                      }}
                    />
                    <span style={{ fontFamily: 'var(--mono)' }}>{tbl}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h4 style={{ margin: 0, fontSize: 12.5 }}>Chế độ chuyển:</h4>
              {[
                ['structure_and_data', 'Cả cấu trúc và dữ liệu (Structure & Data)'],
                ['structure_only', 'Chỉ cấu trúc bảng (Structure Only)'],
                ['data_only', 'Chỉ dữ liệu dòng (Data Only)'],
              ].map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                  <input
                    type="radio"
                    name="transferMode"
                    value={val}
                    checked={transferMode === val}
                    onChange={() => setTransferMode(val as typeof transferMode)}
                  />
                  <span>{label}</span>
                </label>
              ))}
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
                    onClick={handleCancelTransfer}
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
                    Huỷ tác vụ (Cancel)
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
                  <span style={{ color: 'var(--text3)' }}>Sẵn sàng. Nhấp Bắt đầu để tiến hành chuyển.</span>
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
