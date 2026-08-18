import { useState } from 'react'
import { Modal } from './Modal'

export interface ShortcutItem {
  id: string
  action: string
  key: string
  defaultKey: string
  category: 'Editor' | 'Data' | 'Navigation' | 'General'
}

export interface ShortcutEditorModalProps {
  onClose: () => void
  onSaveShortcuts?: (shortcuts: ShortcutItem[]) => void
}

const INITIAL_SHORTCUTS: ShortcutItem[] = [
  { id: 'run_query', action: 'Chạy Query / Thực thi', key: 'Ctrl+Enter', defaultKey: 'Ctrl+Enter', category: 'Editor' },
  { id: 'stop_query', action: 'Dừng Query đang chạy', key: 'Escape', defaultKey: 'Escape', category: 'Editor' },
  { id: 'format_sql', action: 'Định dạng SQL (Format)', key: 'Shift+Alt+F', defaultKey: 'Shift+Alt+F', category: 'Editor' },
  { id: 'explain_query', action: 'Xem kế hoạch Explain', key: 'F7', defaultKey: 'F7', category: 'Editor' },
  { id: 'find_replace', action: 'Tìm kiếm & Thay thế', key: 'Ctrl+F', defaultKey: 'Ctrl+F', category: 'General' },
  { id: 'toggle_maximize', action: 'Phóng to / Khôi phục Pane', key: 'Ctrl+M', defaultKey: 'Ctrl+M', category: 'Navigation' },
  { id: 'command_palette', action: 'Mở Command Palette', key: 'Ctrl+P', defaultKey: 'Ctrl+P', category: 'Navigation' },
  { id: 'apply_changes', action: 'Áp dụng thay đổi DataGrid', key: 'Ctrl+S', defaultKey: 'Ctrl+S', category: 'Data' },
  { id: 'insert_row', action: 'Thêm dòng mới', key: 'Ctrl+N', defaultKey: 'Ctrl+N', category: 'Data' },
]

export function ShortcutEditorModal({ onClose, onSaveShortcuts }: ShortcutEditorModalProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>(INITIAL_SHORTCUTS)

  // Conflict detection
  const keyCounts = shortcuts.reduce((acc, s) => {
    const k = s.key.toUpperCase()
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const hasConflict = Object.values(keyCounts).some((c) => c > 1)

  const handleKeyChange = (id: string, newKey: string) => {
    setShortcuts(shortcuts.map((s) => (s.id === id ? { ...s, key: newKey } : s)))
  }

  const handleReset = () => {
    setShortcuts(INITIAL_SHORTCUTS)
  }

  return (
    <Modal onClose={onClose} surface={{ width: 580, height: 460, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 38,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        <span>⌨️ Tuỳ biến Phím tắt (Shortcut Editor)</span>
      </div>

      <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hasConflict && (
          <div style={{ padding: 8, borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: 11 }}>
            ⚠️ <strong>Phát hiện xung đột phím tắt:</strong> Có nhiều hơn một hành động được gán cùng một tổ hợp phím.
          </div>
        )}

        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 4, overflow: 'auto', background: 'var(--pane)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--pane2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Hành động</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)' }}>Nhóm</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text2)', width: 140 }}>Phím tắt</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((s) => {
                const isDuplicated = (keyCounts[s.key.toUpperCase()] || 0) > 1
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: isDuplicated ? 'rgba(239, 68, 68, 0.08)' : undefined }}>
                    <td style={{ padding: '6px 10px', color: 'var(--text)' }}>{s.action}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--text3)' }}>{s.category}</td>
                    <td style={{ padding: '4px 10px' }}>
                      <input
                        value={s.key}
                        onChange={(e) => handleKeyChange(s.id, e.target.value)}
                        style={{
                          width: '100%',
                          height: 22,
                          padding: '0 6px',
                          background: 'var(--pane2)',
                          border: isDuplicated ? '1px solid #ef4444' : '1px solid var(--border-strong)',
                          borderRadius: 3,
                          color: isDuplicated ? '#ef4444' : 'var(--text)',
                          fontFamily: 'var(--mono)',
                          fontSize: 10.5,
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          height: 46,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          borderTop: '1px solid var(--border)',
          background: 'var(--pane2)',
        }}
      >
        <button
          onClick={handleReset}
          style={{ padding: '5px 12px', border: '1px solid var(--border)', background: 'transparent', borderRadius: 4, color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}
        >
          Đặt lại mặc định
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '5px 12px', border: '1px solid var(--border-strong)', background: 'transparent', borderRadius: 4, color: 'var(--text)', fontSize: 11.5, cursor: 'pointer' }}
          >
            Huỷ
          </button>
          <button
            onClick={() => {
              onSaveShortcuts?.(shortcuts)
              onClose()
            }}
            disabled={hasConflict}
            style={{
              padding: '5px 16px',
              border: 'none',
              background: hasConflict ? 'var(--text3)' : 'var(--accent)',
              color: 'var(--on-accent)',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: hasConflict ? 'not-allowed' : 'pointer',
            }}
          >
            Lưu phím tắt
          </button>
        </div>
      </div>
    </Modal>
  )
}
