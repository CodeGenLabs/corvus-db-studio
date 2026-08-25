import { useRef } from 'react'
import { SearchIcon } from './SearchIcon'
import { useStudio, useClient } from '../store/studio'
import { exportConnectionsFile, parseConnectionsBackup } from '../utils/connection-export-import'
import type { ConnectionProfile } from '@corvus/contract'
import type { MenuKey } from '../types'

type MenuEntry = '-' | [label: string, hint: string, action: () => void, checked?: boolean]

export function MenuBar() {
  const { s, set, t, tr, openTab, closeTab } = useStudio()
  const client = useClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const view = s.view

  const handleExportConnections = async () => {
    try {
      const list = await client.request<ConnectionProfile[]>('connection.list', {})
      if (Array.isArray(list) && list.length > 0) {
        exportConnectionsFile(list)
      } else {
        alert(tr('Chưa có cấu hình kết nối nào để xuất.', 'No connection configurations to export.'))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr('Lỗi khi lấy danh sách kết nối.', 'Failed to retrieve connections list.')
      alert(msg)
    }
  }

  const handleImportConnectionsClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) return

      const result = parseConnectionsBackup(content)
      if (result.valid && result.connections.length > 0) {
        set({
          importConnData: {
            open: true,
            connections: result.connections,
            fileName: file.name,
          },
        })
      } else {
        alert(result.error || tr('Tệp không chứa danh sách kết nối hợp lệ.', 'Invalid connections backup file.'))
      }
    }
    reader.readAsText(file)
  }

  const menus: { key: MenuKey; label: string; items: MenuEntry[] }[] = [
    {
      key: 'file',
      label: t.mFile,
      items: [
        [tr('Kết nối mới…', 'New connection…'), '⌘⇧N', () => set({ showConn: true })],
        [
          tr('Truy vấn mới', 'New query'),
          '⌘N',
          () => {
            const sqlCount = s.tabs.filter((t) => t.identity.type === 'tool' && t.identity.toolKind === 'sql').length
            openTab({ type: 'tool', toolKind: 'sql', seq: sqlCount + 1 })
          },
        ],
        '-',
        [tr('Xuất danh sách kết nối…', 'Export connections…'), '', handleExportConnections],
        [tr('Nhập danh sách kết nối…', 'Import connections…'), '', handleImportConnectionsClick],
        '-',
        [
          tr('Đóng tab', 'Close tab'),
          '⌘W',
          () => {
            if (s.activeTabId) closeTab(s.activeTabId)
          },
        ],
      ],
    },
    {
      key: 'edit',
      label: t.mEdit,
      items: [
        [tr('Hoàn tác', 'Undo'), '⌘Z', () => {}],
        [tr('Làm lại', 'Redo'), '⇧⌘Z', () => {}],
        '-',
        [tr('Cắt', 'Cut'), '⌘X', () => document.execCommand?.('cut')],
        [tr('Sao chép', 'Copy'), '⌘C', () => document.execCommand?.('copy')],
        [tr('Dán', 'Paste'), '⌘V', () => document.execCommand?.('paste')],
        '-',
        [tr('Bảng lệnh', 'Command palette'), '⌘K', () => set({ showPalette: true })],
      ],
    },
    {
      key: 'view',
      label: t.mView,
      items: [
        [t.navPane, '⌥⌘1', () => set((p) => ({ nav: !p.nav })), s.nav],
        [t.infoPane, '⌥⌘2', () => set((p) => ({ info: !p.info })), s.info],
        '-',
        [t.tabObjects, '⌘1', () => set({ view: 'objects' }), view === 'objects'],
        [tr('Dữ liệu bảng', 'Table data'), '⌘2', () => set({ view: 'data' }), view === 'data'],
        ['SQL Editor', '⌘3', () => set({ view: 'sql' }), view === 'sql'],
        ['ER Diagram', '⌘4', () => set({ view: 'er' }), view === 'er'],
        [t.tabCompare, '⌘5', () => set({ view: 'compare' }), view === 'compare'],
        '-',
        [
          tr('Toàn màn hình', 'Full screen'),
          '⌃⌘F',
          () => {
            if (typeof document !== 'undefined') {
              if (!document.fullscreenElement) {
                void document.documentElement?.requestFullscreen?.()
              } else {
                void document.exitFullscreen?.()
              }
            }
          },
        ],
      ],
    },
    {
      key: 'tools',
      label: t.mTools,
      items: [
        [t.captureSnap + '…', '⌘⇧C', () => openTab({ type: 'tool', toolKind: 'compare', seq: 1 })],
        [tr('Sao lưu…', 'Backup…'), '', () => openTab({ type: 'tool', toolKind: 'backup', seq: 1 })],
        [t.tbAutomation + '…', '', () => openTab({ type: 'tool', toolKind: 'jobs', seq: 1 })],
        '-',
        [tr('Bảng lệnh', 'Command palette'), '⌘K', () => set({ showPalette: true })],
        '-',
        [t.settings + '…', '⌘,', () => set({ dialog: 'settings' })],
      ],
    },
    {
      key: 'window',
      label: t.mWindow,
      items: [
        [
          tr('Thu nhỏ', 'Minimize'),
          '⌘M',
          () => {
            const api = (window as unknown as { electron?: { window?: { minimize?: () => void } } })
            api.electron?.window?.minimize?.()
          },
        ],
        [
          tr('Phóng to', 'Zoom'),
          '',
          () => {
            const api = (window as unknown as { electron?: { window?: { maximize?: () => void } } })
            api.electron?.window?.maximize?.()
          },
        ],
        '-',
        [
          tr('Tab kế tiếp', 'Next tab'),
          '⌃⇥',
          () => {
            if (s.tabs.length > 1 && s.activeTabId) {
              const idx = s.tabs.findIndex((tab) => tab.id === s.activeTabId)
              const next = s.tabs[(idx + 1) % s.tabs.length]
              set({ activeTabId: next.id })
            }
          },
        ],
        [
          tr('Tab trước', 'Previous tab'),
          '⌃⇧⇥',
          () => {
            if (s.tabs.length > 1 && s.activeTabId) {
              const idx = s.tabs.findIndex((tab) => tab.id === s.activeTabId)
              const prev = s.tabs[(idx - 1 + s.tabs.length) % s.tabs.length]
              set({ activeTabId: prev.id })
            }
          },
        ],
      ],
    },
    {
      key: 'help',
      label: t.mHelp,
      items: [
        [tr('Tài liệu', 'Documentation'), '', () => { window.open?.('https://github.com/CodeGenLabs/corvus-db-studio#readme', '_blank') }],
        [tr('Phím tắt', 'Keyboard shortcuts'), '⌘/', () => set({ showPalette: true })],
        '-',
        [t.checkUpdates + '…', '', () => set({ dialog: 'updates' })],
        [tr('Giới thiệu ', 'About ') + 'Corvus DB Studio', '', () => set({ dialog: 'about' })],
      ],
    },
  ]

  return (
    <div
      style={{
        height: 26,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '0 10px',
        background: 'var(--pane2)',
        borderBottom: '1px solid var(--border)',
        color: 'var(--text2)',
        fontSize: 11.5,
      }}
    >
      <div
        style={{
          padding: '0 8px',
          height: 18,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 4,
          cursor: 'default',
          fontWeight: 600,
          color: 'var(--text)',
        }}
      >
        Corvus
      </div>

      {menus.map((m) => {
        const open = s.menu === m.key
        return (
          <div key={m.key} style={{ position: 'relative' }}>
            <div
              className="hv-accent-soft"
              onClick={(e) => {
                e.stopPropagation()
                set((prev) => ({ menu: prev.menu === m.key ? null : m.key }))
              }}
              onMouseEnter={() => {
                if (s.menu) set({ menu: m.key })
              }}
              style={{
                padding: '0 8px',
                height: 18,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
                cursor: 'pointer',
                background: open ? 'var(--accent-soft)' : 'transparent',
                color: open ? 'var(--accent)' : 'var(--text2)',
              }}
            >
              {m.label}
            </div>

            {open && (
              <div
                className="pop-in"
                style={{
                  position: 'absolute',
                  top: 22,
                  left: 0,
                  minWidth: 232,
                  background: 'var(--pane)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 7,
                  boxShadow: 'var(--shadow)',
                  padding: 4,
                  zIndex: 50,
                }}
              >
                {m.items.map((it, i) =>
                  it === '-' ? (
                    <div
                      key={'sep' + i}
                      style={{ height: 1, margin: '4px 6px', background: 'var(--grid-line)', pointerEvents: 'none' }}
                    />
                  ) : (
                    <div
                      key={it[0]}
                      className="hv-accent-soft"
                      onClick={() => {
                        set({ menu: null })
                        it[2]?.()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: 24,
                        padding: '0 9px 0 6px',
                        borderRadius: 5,
                        cursor: 'pointer',
                        fontSize: 11.5,
                        color: 'var(--text)',
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          flex: 'none',
                          color: 'var(--accent)',
                          visibility: it[3] ? 'visible' : 'hidden',
                          fontSize: 10,
                        }}
                      >
                        ✓
                      </span>
                      <span>{it[0]}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                        {it[1]}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )
      })}

      <div
        className="hv-accent-border"
        onClick={() => set({ showPalette: true })}
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 18,
          padding: '0 8px',
          borderRadius: 4,
          border: '1px solid var(--border-strong)',
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        <SearchIcon />
        <span>{t.paletteHint}</span>
        <span style={{ fontFamily: 'var(--mono)', opacity: 0.7 }}>⌘K</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  )
}
