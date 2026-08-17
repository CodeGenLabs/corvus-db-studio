import { useState } from 'react'
import { WizardShell } from '../components/wizard'

const STEPS = [
  { id: 'file', title: '1. Chọn tệp sao lưu' },
  { id: 'inspect', title: '2. Thông tin bản sao lưu' },
  { id: 'preview', title: '3. Xem trước & Cảnh báo' },
  { id: 'run', title: '4. Khôi phục' },
]

export interface RestoreWizardProps {
  onClose: () => void
  onComplete?: () => void
}

export function RestoreWizard({ onClose, onComplete }: RestoreWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [filePath, setFilePath] = useState('D:\\backups\\sakila_20260812_1042.sql.gz')
  const [targetDatabase, setTargetDatabase] = useState('sakila')
  const [dropExisting, setDropExisting] = useState(true)

  const backupMeta = {
    version: '1.0.0',
    createdAt: '2026-08-12 10:42:15',
    database: 'sakila',
    driver: 'MySQL 8.0',
    tablesCount: 15,
    size: '3.1 GB',
    compressed: true,
    checksum: 'sha256:8f4c2e...verified',
  }

  const handleFinish = () => {
    if (onComplete) onComplete()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      <div style={{ width: 720, height: 460 }}>
        <WizardShell
          title="Trình thuật sĩ khôi phục cơ sở dữ liệu (Restore Wizard)"
          steps={STEPS}
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
          onCancel={onClose}
          onFinish={handleFinish}
        >
          {currentStep === 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Chọn tệp sao lưu (.sql, .sql.gz, .corvus.bak)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    Đường dẫn tệp sao lưu:
                  </label>
                  <input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    style={{
                      width: '100%',
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
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    Database đích khôi phục:
                  </label>
                  <input
                    value={targetDatabase}
                    onChange={(e) => setTargetDatabase(e.target.value)}
                    style={{
                      width: 240,
                      height: 28,
                      padding: '0 8px',
                      background: 'var(--pane2)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 4,
                      color: 'var(--text)',
                      fontSize: 11.5,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Kiểm tra thông tin bản sao lưu & Tính toàn vẹn
              </h4>
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: 12,
                  background: 'var(--pane2)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  fontSize: 11.5,
                }}
              >
                <div><span style={{ color: 'var(--text3)' }}>Ngày tạo:</span> <strong style={{ color: 'var(--text)' }}>{backupMeta.createdAt}</strong></div>
                <div><span style={{ color: 'var(--text3)' }}>Database gốc:</span> <strong style={{ color: 'var(--text)' }}>{backupMeta.database}</strong></div>
                <div><span style={{ color: 'var(--text3)' }}>Engine gốc:</span> <strong style={{ color: 'var(--text)' }}>{backupMeta.driver}</strong></div>
                <div><span style={{ color: 'var(--text3)' }}>Số bảng:</span> <strong style={{ color: 'var(--text)' }}>{backupMeta.tablesCount} bảng</strong></div>
                <div><span style={{ color: 'var(--text3)' }}>Dung lượng:</span> <strong style={{ color: 'var(--text)' }}>{backupMeta.size}</strong></div>
                <div><span style={{ color: 'var(--text3)' }}>Checksum:</span> <span style={{ color: '#4ade80', fontFamily: 'var(--mono)' }}>✓ {backupMeta.checksum}</span></div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
                Tuỳ chọn & Cảnh báo an toàn
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5 }}>
                <div style={{ padding: 10, borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  ⚠ CẢNH BÁO: Khôi phục sẽ ghi đè lên các bảng hiện có trong database "{targetDatabase}".
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={dropExisting}
                    onChange={(e) => setDropExisting(e.target.checked)}
                  />
                  <span>Xoá bảng cũ trước khi khôi phục (DROP TABLE IF EXISTS)</span>
                </label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
                Sẵn sàng khôi phục
              </h4>
              <p style={{ fontSize: 11.5, color: 'var(--text2)', margin: '0 0 12px' }}>
                Nhấp "Bắt đầu" để khởi chạy tác vụ khôi phục dữ liệu qua Job Runner.
              </p>
              <div style={{ padding: 12, borderRadius: 6, background: 'var(--pane2)', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                Source: {filePath}<br />
                Target: {targetDatabase}<br />
                Scope: Full Restore ({backupMeta.tablesCount} tables)<br />
                Mode: {dropExisting ? 'DROP & RECREATE' : 'INSERT ONLY'}
              </div>
            </div>
          )}
        </WizardShell>
      </div>
    </div>
  )
}
