import { useState } from 'react'
import { WizardShell } from '../components/wizard/WizardShell'
import { useClient } from '../store/studio'

export interface DumpExecuteSqlWizardProps {
  mode: 'dump' | 'execute'
  onClose: () => void
  onComplete?: () => void
  initialConnectionId?: string
}

const DUMP_STEPS = [
  { id: 'objects', title: 'Đối tượng xuất (Objects)' },
  { id: 'options', title: 'Tuỳ chọn xuất (Options)' },
  { id: 'dest', title: 'Tệp xuất (Destination)' },
  { id: 'progress', title: 'Tiến trình (Progress)' },
]

const EXECUTE_STEPS = [
  { id: 'source', title: 'Chọn tệp SQL (Source File)' },
  { id: 'options', title: 'Tuỳ chọn chạy (Options)' },
  { id: 'progress', title: 'Tiến trình thực thi (Progress)' },
]

export function DumpExecuteSqlWizard({
  mode,
  onClose,
  onComplete,
  initialConnectionId = 'conn-1',
}: DumpExecuteSqlWizardProps) {
  const client = useClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [filePath, setFilePath] = useState(mode === 'dump' ? 'D:\\exports\\backup.sql' : 'D:\\scripts\\migration.sql')
  const [selectedTables, setSelectedTables] = useState<string[]>(['customer', 'film', 'actor'])
  const [includeDropTable, setIncludeDropTable] = useState(true)
  const [continueOnError, setContinueOnError] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string>('idle')
  const [jobLogs, setJobLogs] = useState<string[]>([])
  const [statementResults, setStatementResults] = useState<Array<{ stmt: string; status: 'ok' | 'error'; err?: string }>>([])

  const steps = mode === 'dump' ? DUMP_STEPS : EXECUTE_STEPS

  const handleBrowseFile = async () => {
    if (!client) return
    try {
      if (mode === 'dump') {
        const res = (await client.request('file.pickSave', {
          defaultPath: filePath,
          filters: [{ name: 'SQL Scripts', extensions: ['sql'] }],
        })) as { path: string | null }
        if (res?.path) setFilePath(res.path)
      } else {
        const res = (await client.request('file.pickOpen', {
          filters: [{ name: 'SQL Scripts', extensions: ['sql'] }],
          multiple: false,
        })) as { paths: string[] }
        if (res?.paths?.[0]) setFilePath(res.paths[0])
      }
    } catch {
      // fallback
    }
  }

  const handleStart = async () => {
    if (!client) return
    try {
      setJobStatus('running')
      const res = (await client.request('job.start', {
        kind: mode === 'dump' ? 'dump' : 'execute_sql',
        name: `${mode === 'dump' ? 'Dump SQL' : 'Execute SQL'} (${filePath})`,
        config: {
          connectionId: initialConnectionId,
          filePath,
          tables: selectedTables,
          includeDropTable,
          continueOnError,
        },
      })) as { jobId: string }

      if (res?.jobId) {
        setJobId(res.jobId)
        const stream = client.stream('job.log', { id: res.jobId })
        for await (const chunk of stream) {
          const text = typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
          setJobLogs((prev) => [...prev, text])
          setStatementResults((prev) => [
            ...prev,
            { stmt: text.slice(0, 40), status: text.includes('Error') ? 'error' : 'ok' },
          ])
        }
        setJobStatus('completed')
        onComplete?.()
      }
    } catch (err) {
      setJobStatus('failed')
      setJobLogs((prev) => [...prev, `Lỗi: ${err instanceof Error ? err.message : String(err)}`])
    }
  }

  const handleCancel = async () => {
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
      <div style={{ width: 720, height: 500 }}>
        <WizardShell
          title={mode === 'dump' ? 'Kết xuất tệp SQL (Dump SQL File)' : 'Thực thi tệp SQL (Execute SQL File)'}
          steps={steps}
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
          onCancel={onClose}
          onFinish={handleStart}
          isFinishDisabled={!filePath}
        >
          {mode === 'dump' && currentStep === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ margin: 0, fontSize: 12.5 }}>Chọn các đối tượng kết xuất:</h4>
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
                {['customer', 'film', 'actor', 'rental', 'payment'].map((tbl) => (
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

          {mode === 'dump' && currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={includeDropTable}
                  onChange={(e) => setIncludeDropTable(e.target.checked)}
                />
                <span>Thêm lệnh DROP TABLE IF EXISTS trước mỗi bảng</span>
              </label>
            </div>
          )}

          {mode === 'dump' && currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600 }}>
                Đường dẫn tệp SQL đích:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  style={{
                    flex: 1,
                    height: 28,
                    padding: '0 8px',
                    background: 'var(--pane2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11.5,
                  }}
                />
                <button
                  onClick={handleBrowseFile}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: 'var(--pane2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Duyệt…
                </button>
              </div>
            </div>
          )}

          {mode === 'execute' && currentStep === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600 }}>
                Đường dẫn tệp SQL nguồn cần thực thi:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  style={{
                    flex: 1,
                    height: 28,
                    padding: '0 8px',
                    background: 'var(--pane2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11.5,
                  }}
                />
                <button
                  onClick={handleBrowseFile}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: 'var(--pane2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Duyệt…
                </button>
              </div>
            </div>
          )}

          {mode === 'execute' && currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 11.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={continueOnError}
                  onChange={(e) => setContinueOnError(e.target.checked)}
                />
                <span>Tiếp tục thực thi khi gặp lỗi (Continue on Error)</span>
              </label>
            </div>
          )}

          {currentStep === steps.length - 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Trạng thái: <span style={{ color: 'var(--accent)' }}>{jobStatus.toUpperCase()}</span>
                </span>
                {jobStatus === 'running' && (
                  <button
                    onClick={handleCancel}
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
                  <span style={{ color: 'var(--text3)' }}>Nhấp Bắt đầu để tiến hành.</span>
                ) : (
                  jobLogs.map((log, idx) => <div key={idx}>{log}</div>)
                )}
                {statementResults.length > 0 && (
                  <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                    {statementResults.map((r, i) => (
                      <div key={i} style={{ color: r.status === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                        {r.status === 'ok' ? '✓' : '✗'} {r.stmt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </WizardShell>
      </div>
    </div>
  )
}
