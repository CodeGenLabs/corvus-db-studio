import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { DB_ICON, dbMark } from '../../data/icons'
import { useStudio, useClient } from '../../store/studio'
import type { ConnectionProfile } from '@corvus/contract'

export type ConflictResolution = 'rename' | 'overwrite' | 'skip'

export interface ImportConnectionsDialogProps {
  open: boolean
  connections: ConnectionProfile[]
  fileName?: string
  onClose: () => void
  onSuccess?: (importedCount: number) => void
}

export function ImportConnectionsDialog({
  open,
  connections,
  fileName,
  onClose,
  onSuccess,
}: ImportConnectionsDialogProps) {
  const { tr } = useStudio()
  const client = useClient()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [conflictPolicy, setConflictPolicy] = useState<ConflictResolution>('rename')
  const [importing, setImporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open && connections.length > 0) {
      setSelectedIds(new Set(connections.map((c) => c.id || c.name)))
      setErrorMsg(null)
      setImporting(false)
    }
  }, [open, connections])

  if (!open) return null

  const allSelected = connections.length > 0 && selectedIds.size === connections.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < connections.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(connections.map((c) => c.id || c.name)))
    }
  }

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleImport = async () => {
    const toImport = connections.filter((c) => selectedIds.has(c.id || c.name))
    if (toImport.length === 0) return

    setImporting(true)
    setErrorMsg(null)

    try {
      // 1. Lấy danh sách kết nối hiện tại để xử lý trùng
      let existing: ConnectionProfile[] = []
      try {
        const list = await client.request<ConnectionProfile[]>('connection.list', {})
        if (Array.isArray(list)) existing = list
      } catch {
        // ignore list error
      }

      const existingByName = new Map<string, ConnectionProfile>()
      for (const item of existing) {
        existingByName.set(item.name.toLowerCase(), item)
      }

      let count = 0
      for (const item of toImport) {
        const key = item.name.toLowerCase()
        const match = existingByName.get(key)

        if (match) {
          if (conflictPolicy === 'skip') {
            continue
          } else if (conflictPolicy === 'overwrite') {
            await client.request('connection.update', {
              ...item,
              id: match.id,
            })
            count++
            continue
          }
        }

        // Chính sách 'rename' hoặc kết nối mới
        let finalName = item.name
        if (match && conflictPolicy === 'rename') {
          let suffix = 1
          while (existingByName.has(`${item.name} (${suffix})`.toLowerCase())) {
            suffix++
          }
          finalName = `${item.name} (${suffix})`
        }

        // Tạo mới
        const createPayload = { ...item }
        delete (createPayload as { id?: string }).id
        await client.request('connection.create', {
          ...createPayload,
          name: finalName,
        })
        existingByName.set(finalName.toLowerCase(), { ...item, name: finalName })
        count++
      }

      setImporting(false)
      onSuccess?.(count)
      onClose()
    } catch (err: unknown) {
      setImporting(false)
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra trong quá trình nạp kết nối.'
      setErrorMsg(msg)
    }
  }

  return (
    <Modal onClose={importing ? () => {} : onClose} surface={{ width: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--pane2)',
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>
          {tr('Nhập danh sách kết nối', 'Import Connections')}
        </div>
        {fileName && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontFamily: 'var(--mono)',
            }}
          >
            {fileName}
          </span>
        )}
        <div
          onClick={importing ? undefined : onClose}
          style={{
            marginLeft: 'auto',
            cursor: importing ? 'not-allowed' : 'pointer',
            color: 'var(--text3)',
            fontSize: 14,
            padding: 4,
          }}
        >
          ✕
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1 }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text2)' }}>
          {tr(
            'Tìm thấy ' + connections.length + ' cấu hình kết nối trong tệp. Hãy tick chọn các kết nối bạn muốn nạp:',
            'Found ' + connections.length + ' connection profiles in file. Pick the connections you want to import:',
          )}
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: 12,
              borderRadius: 6,
              background: 'var(--red-soft, rgba(239, 68, 68, 0.1))',
              border: '1px solid var(--red, #ef4444)',
              color: 'var(--red, #ef4444)',
              fontSize: 12,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Table Preview */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 120px 1fr 120px',
              background: 'var(--pane2)',
              borderBottom: '1px solid var(--border)',
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text3)',
              alignItems: 'center',
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={toggleSelectAll}
              style={{ cursor: 'pointer' }}
            />
            <span>{tr('Hệ quản trị', 'Engine')}</span>
            <span>{tr('Tên kết nối', 'Name')}</span>
            <span>{tr('Host / Database', 'Endpoint')}</span>
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {connections.map((c) => {
              const itemKey = c.id || c.name
              const isChecked = selectedIds.has(itemKey)
              const mark = dbMark(c.driverId) ?? DB_ICON.Postgres
              const endpoint = c.host ? `${c.host}:${c.port || ''}` : (c.database || 'local')

              return (
                <div
                  key={itemKey}
                  onClick={() => toggleSelectOne(itemKey)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 120px 1fr 120px',
                    padding: '8px 10px',
                    borderBottom: '1px solid var(--grid-line)',
                    fontSize: 11.5,
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isChecked ? 'var(--pane)' : 'var(--pane2)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{mark}</span>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text2)' }}>{c.driverId}</span>
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 10.5, fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {endpoint}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conflict Resolution */}
        <div style={{ background: 'var(--pane2)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
            {tr('Xử lý khi trùng tên kết nối:', 'Duplicate name conflict policy:')}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="radio"
                name="conflict"
                value="rename"
                checked={conflictPolicy === 'rename'}
                onChange={() => setConflictPolicy('rename')}
              />
              {tr('Tự động đổi tên (1)', 'Rename duplicate')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="radio"
                name="conflict"
                value="overwrite"
                checked={conflictPolicy === 'overwrite'}
                onChange={() => setConflictPolicy('overwrite')}
              />
              {tr('Ghi đè cấu hình', 'Overwrite')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input
                type="radio"
                name="conflict"
                value="skip"
                checked={conflictPolicy === 'skip'}
                onChange={() => setConflictPolicy('skip')}
              />
              {tr('Bỏ qua', 'Skip')}
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--pane2)',
        }}
      >
        <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
          {tr('Đã chọn: ' + selectedIds.size + ' / ' + connections.length + ' kết nối', 'Selected: ' + selectedIds.size + ' / ' + connections.length + ' connections')}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            disabled={importing}
            style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 5,
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text2)',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: 11.5,
            }}
          >
            {tr('Huỷ', 'Cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={importing || selectedIds.size === 0}
            style={{
              height: 28,
              padding: '0 16px',
              borderRadius: 5,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              fontWeight: 600,
              cursor: (importing || selectedIds.size === 0) ? 'not-allowed' : 'pointer',
              fontSize: 11.5,
              opacity: (importing || selectedIds.size === 0) ? 0.6 : 1,
            }}
          >
            {importing ? tr('Đang nạp…', 'Importing…') : tr('Nhập ' + selectedIds.size + ' kết nối', 'Import ' + selectedIds.size + ' connections')}
          </button>
        </div>
      </div>
    </Modal>
  )
}