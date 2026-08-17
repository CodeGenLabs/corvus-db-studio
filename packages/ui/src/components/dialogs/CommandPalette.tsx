import { useState, useEffect, useRef } from 'react'
import { SearchIcon } from '../SearchIcon'
import { useStudio } from '../../store/studio'

interface PaletteItem {
  id: string
  label: string
  category: 'Views' | 'Tables' | 'Actions' | 'Tools'
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const { set, t, tr, setView } = useStudio()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const close = () => set({ showPalette: false })

  const allItems: PaletteItem[] = [
    { id: 'v-objects', label: tr('Mở xem cấu trúc Đối tượng (Objects View)', 'Open Objects View'), category: 'Views', shortcut: '⌘1', action: () => { setView('objects')(); close(); } },
    { id: 'v-data', label: tr('Xem & Sửa Dữ liệu bảng (Data View)', 'Open Data View'), category: 'Views', shortcut: '⌘2', action: () => { setView('data')(); close(); } },
    { id: 'v-sql', label: tr('Mở trình soạn thảo SQL (SQL Editor)', 'Open SQL Editor'), category: 'Views', shortcut: '⌘3', action: () => { setView('sql')(); close(); } },
    { id: 'v-design', label: tr('Thiết kế Bảng (Table Designer)', 'Open Table Designer'), category: 'Views', shortcut: '⌘4', action: () => { setView('design')(); close(); } },
    { id: 'v-er', label: tr('Sơ đồ quan hệ ER Diagram', 'Open ER Diagram'), category: 'Views', shortcut: '⌘5', action: () => { setView('er')(); close(); } },
    { id: 'v-backup', label: tr('Sao lưu & Khôi phục (Backup / Restore)', 'Open Backup View'), category: 'Views', shortcut: '⌘6', action: () => { setView('backup')(); close(); } },
    { id: 'v-jobs', label: tr('Quản lý Tác vụ tự động (Automation Jobs)', 'Open Jobs View'), category: 'Views', shortcut: '⌘7', action: () => { setView('jobs')(); close(); } },
    { id: 'a-conn', label: tr('Tạo kết nối mới…', 'New Connection…'), category: 'Actions', shortcut: '⌘⇧N', action: () => { set({ showConn: true }); close(); } },
    { id: 'a-users', label: tr('Quản lý người dùng & Phân quyền…', 'Manage Users & Permissions…'), category: 'Tools', action: () => { set({ dialog: 'users' }); close(); } },
    { id: 'a-settings', label: tr('Cài đặt hệ thống…', 'Preferences / Settings…'), category: 'Tools', shortcut: '⌘,', action: () => { set({ dialog: 'settings' }); close(); } },
    { id: 't-cust', label: 'customer (Table in sakila)', category: 'Tables', action: () => { setView('data')(); close(); } },
    { id: 't-film', label: 'film (Table in sakila)', category: 'Tables', action: () => { setView('data')(); close(); } },
    { id: 't-actor', label: 'actor (Table in sakila)', category: 'Tables', action: () => { setView('data')(); close(); } },
  ]

  const filtered = allItems.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase()),
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      close()
    }
  }

  return (
    <div
      onClick={close}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(12,14,15,.42)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 100,
        zIndex: 30,
      }}
    >
      <div
        className="pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          background: 'var(--pane)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', borderBottom: '1px solid var(--border)' }}>
          <SearchIcon size={15} stroke="var(--text3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.paletteHint}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: 13,
            }}
          />
        </div>

        <div style={{ maxHeight: 320, overflow: 'auto', padding: '4px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px 20px', color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
              Không tìm thấy lệnh hoặc đối tượng phù hợp
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 32,
                    padding: '0 14px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text)',
                    fontSize: 11.5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      padding: '2px 5px',
                      borderRadius: 3,
                      background: 'var(--pane2)',
                      color: 'var(--text3)',
                      fontWeight: 600,
                    }}
                  >
                    {item.category}
                  </span>
                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{item.label}</span>
                  {item.shortcut && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        color: 'var(--text3)',
                        fontFamily: 'var(--mono)',
                        fontSize: 10.5,
                      }}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
