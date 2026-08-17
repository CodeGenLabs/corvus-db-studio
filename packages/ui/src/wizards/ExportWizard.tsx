import { useState } from 'react'
import { WizardShell } from '../components/wizard'
import type { ExportFormat } from '@corvus/contract'

const STEPS = [
  { id: 'format', title: '1. Định dạng xuất' },
  { id: 'source', title: '2. Đối tượng nguồn' },
  { id: 'columns', title: '3. Chọn cột' },
  { id: 'options', title: '4. Tuỳ chọn' },
  { id: 'destination', title: '5. Đích lưu & Bắt đầu' },
]

export interface ExportWizardProps {
  onClose: () => void
  onComplete?: () => void
  defaultTable?: string
}

export function ExportWizard({ onClose, onComplete, defaultTable = 'customer' }: ExportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [selectedTables, setSelectedTables] = useState<string[]>([defaultTable])
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [encoding, setEncoding] = useState('utf-8')
  const [destPath, setDestPath] = useState(`D:\\exports\\${defaultTable}_export.csv`)

  const availableColumns = ['customer_id', 'first_name', 'last_name', 'email', 'active', 'create_date']
  const [selectedCols, setSelectedCols] = useState<string[]>(availableColumns)

  const handleToggleCol = (col: string) => {
    if (selectedCols.includes(col)) {
      setSelectedCols(selectedCols.filter((c) => c !== col))
    } else {
      setSelectedCols([...selectedCols, col])
    }
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
      <div style={{ width: 720, height: 480 }}>
        <WizardShell
          title="Trình thuật sĩ xuất dữ liệu (Export Wizard)"
          steps={STEPS}
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
          onCancel={onClose}
          onFinish={handleFinish}
        >
          {currentStep === 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Chọn định dạng tệp muốn xuất
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {(
                  [
                    ['csv', 'CSV (.csv)', 'Tách bằng dấu phẩy'],
                    ['tsv', 'TSV (.tsv)', 'Tách bằng ký tự Tab'],
                    ['json', 'JSON (.json)', 'Dữ liệu cấu trúc JSON'],
                    ['xml', 'XML (.xml)', 'Cấu trúc XML element'],
                    ['sql', 'SQL (.sql)', 'Tập lệnh INSERT statements'],
                    ['markdown', 'Markdown (.md)', 'Bảng định dạng Markdown'],
                    ['xlsx', 'Excel (.xlsx)', 'Bảng tính Excel'],
                    ['html', 'HTML (.html)', 'Trang web bảng HTML'],
                  ] as const
                ).map(([fmt, label, desc]) => (
                  <div
                    key={fmt}
                    onClick={() => {
                      setFormat(fmt)
                      setDestPath(`D:\\exports\\${defaultTable}_export.${fmt === 'markdown' ? 'md' : fmt}`)
                    }}
                    style={{
                      padding: 10,
                      border: format === fmt ? '2px solid var(--accent)' : '1px solid var(--border-strong)',
                      borderRadius: 6,
                      background: format === fmt ? 'var(--accent-soft)' : 'var(--pane2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 4 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Chọn bảng / đối tượng nguồn
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['customer', 'film', 'actor', 'payment', 'rental', 'country', 'city'].map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(t)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTables([...selectedTables, t])
                        else setSelectedTables(selectedTables.filter((x) => x !== t))
                      }}
                    />
                    <span style={{ fontFamily: 'var(--mono)' }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Chọn các cột cần xuất ({selectedCols.length} / {availableColumns.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {availableColumns.map((col) => (
                  <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={selectedCols.includes(col)}
                      onChange={() => handleToggleCol(col)}
                    />
                    <span style={{ fontFamily: 'var(--mono)' }}>{col}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Tuỳ chọn xuất dữ liệu
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5, color: 'var(--text)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                  />
                  <span>Bao gồm dòng tiêu đề tên cột ở đầu tệp</span>
                </label>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    Bảng mã ký tự:
                  </label>
                  <select
                    value={encoding}
                    onChange={(e) => setEncoding(e.target.value)}
                    style={{
                      height: 24,
                      padding: '0 6px',
                      background: 'var(--pane2)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 3,
                      color: 'var(--text)',
                      fontSize: 11,
                    }}
                  >
                    <option value="utf-8">UTF-8</option>
                    <option value="utf-16">UTF-16</option>
                    <option value="windows-1252">Windows-1252</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Đích lưu tệp xuất
              </h4>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                  Đường dẫn lưu tệp:
                </label>
                <input
                  value={destPath}
                  onChange={(e) => setDestPath(e.target.value)}
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

              <div style={{ marginTop: 16, padding: 10, background: 'var(--accent-soft)', borderRadius: 6, color: 'var(--accent)', fontSize: 11.5 }}>
                ℹ Nhấp "Bắt đầu" để khởi chạy tác vụ xuất dữ liệu dưới dạng Job chạy nền.
              </div>
            </div>
          )}
        </WizardShell>
      </div>
    </div>
  )
}
