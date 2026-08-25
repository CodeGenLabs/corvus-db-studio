import { useState } from 'react'
import { WizardShell } from '../components/wizard'
import { FieldMappingGrid } from './import/FieldMappingGrid'
import { parseDelimited, generateImportSql, inferColumnType } from '@corvus/sql'
import { useClient } from '../store/studio'
import type { FieldMapping, ImportFormat, ImportMode, ImportOptions } from '@corvus/contract'

const STEPS = [
  { id: 'format', title: '1. Định dạng' },
  { id: 'file', title: '2. Tệp nguồn' },
  { id: 'delimiter', title: '3. Phân tách & Xem trước' },
  { id: 'options', title: '4. Tuỳ chọn' },
  { id: 'mapping', title: '5. Ánh xạ trường' },
  { id: 'mode', title: '6. Chế độ & Chạy' },
]

export interface ImportWizardProps {
  onClose: () => void
  onComplete?: () => void
}

export function ImportWizard({ onClose, onComplete }: ImportWizardProps) {
  const client = useClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [format, setFormat] = useState<ImportFormat>('csv')
  const [fileName, setFileName] = useState('customers_sample.csv')

  const handleBrowseFile = async () => {
    if (!client) return
    try {
      const res = (await client.request('file.pickOpen', {
        filters: [{ name: 'Data files', extensions: [format, 'csv', 'tsv', 'json', 'txt'] }],
        multiple: false,
      })) as { paths: string[] }
      if (res?.paths?.[0]) {
        const p = res.paths[0]
        setFileName(p)
        const stat = (await client.request('file.stat', { path: p })) as { sizeBytes: number }
        if (stat?.sizeBytes) {
          await client.request('file.readChunk', {
            path: p,
            offset: 0,
            length: Math.min(stat.sizeBytes, 64 * 1024),
          })
        }
      }
    } catch {
      // fallback
    }
  }
  const [rawText] = useState(
    `customer_id,first_name,last_name,email,active\n1,MARY,SMITH,MARY.SMITH@sakilacustomer.org,1\n2,PATRICIA,JOHNSON,PATRICIA.JOHNSON@sakilacustomer.org,1\n3,LINDA,WILLIAMS,LINDA.WILLIAMS@sakilacustomer.org,1\n4,BARBARA,JONES,BARBARA.JONES@sakilacustomer.org,1`,
  )

  const [options, setOptions] = useState<ImportOptions>({
    delimiter: ',',
    qualifier: '"',
    headerRow: 1,
    dataStartRow: 2,
    encoding: 'utf-8',
    emptyAsNull: true,
    continueOnError: false,
    batchSize: 1000,
  })

  const [targetTable, setTargetTable] = useState('customer')
  const [importMode, setImportMode] = useState<ImportMode>('append')

  const parsedRows = parseDelimited(rawText, options.delimiter, options.qualifier)
  const headers = parsedRows[0] || ['col1', 'col2', 'col3']
  const dataRows = parsedRows.slice(options.dataStartRow - 1)

  const [mappings, setMappings] = useState<FieldMapping[]>([
    { sourceField: 'customer_id', targetField: 'customer_id', targetType: 'INT', isKey: true },
    { sourceField: 'first_name', targetField: 'first_name', targetType: 'VARCHAR(50)' },
    { sourceField: 'last_name', targetField: 'last_name', targetType: 'VARCHAR(50)' },
    { sourceField: 'email', targetField: 'email', targetType: 'VARCHAR(100)' },
    { sourceField: 'active', targetField: 'active', targetType: 'TINYINT' },
  ])

  const targetColumns = ['customer_id', 'first_name', 'last_name', 'email', 'active', 'create_date']

  const handleUpdateMapping = (idx: number, updates: Partial<FieldMapping>) => {
    setMappings(mappings.map((m, i) => (i === idx ? { ...m, ...updates } : m)))
  }

  const handleSmartMatch = () => {
    setMappings(
      headers.map((h, i) => {
        const samples = dataRows.map((r) => r[i] || '')
        const inferred = inferColumnType(samples)
        const matched = targetColumns.find((c) => c.toLowerCase() === h.toLowerCase()) || h
        return {
          sourceField: h,
          targetField: matched,
          targetType: inferred,
          isKey: i === 0,
        }
      }),
    )
  }

  const handleDirectMatch = () => {
    setMappings(
      headers.map((h, i) => ({
        sourceField: h,
        targetField: targetColumns[i] || h,
        targetType: 'VARCHAR(255)',
        isKey: i === 0,
      })),
    )
  }

  const handleUnmatchAll = () => {
    setMappings(
      mappings.map((m) => ({
        ...m,
        ignored: true,
      })),
    )
  }

  const generatedSql = generateImportSql(targetTable, mappings, dataRows, importMode, 'mysql')

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
      <div style={{ width: 780, height: 520 }}>
        <WizardShell
          title="Trình thuật sĩ nhập dữ liệu (Import Wizard)"
          steps={STEPS}
          currentStepIndex={currentStep}
          onStepChange={setCurrentStep}
          onCancel={onClose}
          onFinish={handleFinish}
        >
          {currentStep === 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Chọn định dạng tệp nguồn
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {(
                  [
                    ['csv', 'CSV (.csv)', 'Tệp phân cách bằng dấu phẩy'],
                    ['tsv', 'TSV (.tsv / .tab)', 'Tệp phân cách bằng tab'],
                    ['txt', 'Văn bản (.txt)', 'Tệp văn bản thuần hoặc fixed-width'],
                    ['json', 'JSON (.json)', 'Mảng hoặc dòng đối tượng JSON'],
                    ['xml', 'XML (.xml)', 'Tệp cấu trúc XML có thẻ phần tử'],
                    ['xlsx', 'Excel (.xlsx)', 'Bảng tính Microsoft Excel'],
                  ] as const
                ).map(([fmt, label, desc]) => (
                  <div
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    style={{
                      padding: 12,
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
                Chọn tệp và bảng mã ký tự (Encoding)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    Đường dẫn tệp:
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      style={{
                        flex: 1,
                        height: 28,
                        padding: '0 8px',
                        background: 'var(--pane2)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 4,
                        color: 'var(--text)',
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

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                    Bảng mã ký tự (Encoding):
                  </label>
                  <select
                    value={options.encoding}
                    onChange={(e) => setOptions({ ...options, encoding: e.target.value })}
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
                  >
                    <option value="utf-8">UTF-8 (Khuyến nghị)</option>
                    <option value="utf-16">UTF-16</option>
                    <option value="windows-1252">Windows-1252 (ANSI)</option>
                    <option value="shift-jis">Shift-JIS (Tiếng Nhật)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
                Tuỳ chọn phân tách & Xem trước dữ liệu ({parsedRows.length} dòng)
              </h4>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text2)', marginRight: 6 }}>Ký tự phân cách:</label>
                  <select
                    value={options.delimiter}
                    onChange={(e) => setOptions({ ...options, delimiter: e.target.value })}
                    style={{ height: 24, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--text)', fontSize: 11 }}
                  >
                    <option value=",">Dấu phẩy (,)</option>
                    <option value=";">Dấu chấm phẩy (;)</option>
                    <option value={'\t'}>Dấu Tab (\t)</option>
                    <option value="|">Dấu gạch đứng (|)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: 'var(--text2)', marginRight: 6 }}>Ký tự bao chuỗi:</label>
                  <select
                    value={options.qualifier}
                    onChange={(e) => setOptions({ ...options, qualifier: e.target.value })}
                    style={{ height: 24, padding: '0 6px', background: 'var(--pane2)', border: '1px solid var(--border-strong)', borderRadius: 3, color: 'var(--text)', fontSize: 11 }}
                  >
                    <option value='"'>Nháy kép (")</option>
                    <option value="'">Nháy đơn (')</option>
                    <option value="">Không có</option>
                  </select>
                </div>
              </div>

              <div style={{ height: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--pane2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--mono)' }}>
                  <thead>
                    <tr style={{ background: 'var(--pane)', borderBottom: '1px solid var(--border)' }}>
                      {headers.map((h, idx) => (
                        <th key={idx} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text2)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.slice(0, 10).map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid var(--grid-line)' }}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ padding: '4px 8px', color: 'var(--text)' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)' }}>
                Các tuỳ chọn xử lý dữ liệu
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5, color: 'var(--text)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={options.emptyAsNull}
                    onChange={(e) => setOptions({ ...options, emptyAsNull: e.target.checked })}
                  />
                  <span>Coi chuỗi rỗng ("") là giá trị NULL</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={options.continueOnError}
                    onChange={(e) => setOptions({ ...options, continueOnError: e.target.checked })}
                  />
                  <span>Bỏ qua lỗi và tiếp tục các dòng sau (Continue on error)</span>
                </label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text)' }}>
                Ánh xạ trường tệp nguồn tới bảng đích
              </h4>
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>Bảng đích:</span>
                <input
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  style={{
                    height: 24,
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
              <FieldMappingGrid
                mappings={mappings}
                targetColumns={targetColumns}
                onUpdateMapping={handleUpdateMapping}
                onSmartMatch={handleSmartMatch}
                onDirectMatch={handleDirectMatch}
                onUnmatchAll={handleUnmatchAll}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
                Chế độ nhập (Import Mode) & Câu lệnh SQL sinh ra
              </h4>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(
                  [
                    ['append', 'Append (Thêm vào)'],
                    ['update', 'Update (Cập nhật)'],
                    ['copy', 'Copy (Xoá bảng & thêm mới)'],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setImportMode(m)}
                    style={{
                      padding: '4px 10px',
                      border: importMode === m ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
                      background: importMode === m ? 'var(--accent-soft)' : 'transparent',
                      color: importMode === m ? 'var(--accent)' : 'var(--text)',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ height: 160, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--pane2)', padding: 8 }}>
                <pre style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {generatedSql.join('\n')}
                </pre>
              </div>
            </div>
          )}
        </WizardShell>
      </div>
    </div>
  )
}
