import { useState } from 'react'
import { Modal } from './Modal'
import { useStudio, useClient } from '../../store/studio'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConnectionProfile } from '@corvus/contract'
import { DB_ICON } from '../../data/icons'

interface ManageConnectionsDialogProps {
  onClose: () => void
  onSelect?: (conn: ConnectionProfile) => void
}

export function ManageConnectionsDialog({ onClose, onSelect }: ManageConnectionsDialogProps) {
  const { tr } = useStudio()
  const client = useClient()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState<string>('')
  const [isDuplicating, setIsDuplicating] = useState(false)

  const { data: connections = [], isLoading } = useQuery<ConnectionProfile[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      if (!client) return []
      return (await client.request('connection.list', {})) as ConnectionProfile[]
    },
  })

  const { data: _fullProfile } = useQuery({
    queryKey: ['connectionProfile', selectedId],
    queryFn: async () => {
      if (!client || !selectedId) return null
      return (await client.request('connection.get', { id: selectedId })) as ConnectionProfile | null
    },
    enabled: !!client && !!selectedId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!client) return
      await client.request('connection.delete', { id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      setSelectedId(null)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      if (!client) return
      await client.request('connection.duplicate', { id, newName })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      setIsDuplicating(false)
      setDuplicateName('')
    },
  })

  const selectedConn = connections.find((c) => c.id === selectedId)

  return (
    <Modal onClose={onClose} surface={{ width: 680, height: 480 }} zIndex={25}>
      <div
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--pane2)',
          fontWeight: 600,
        }}
      >
        <span>{tr('Quản lý kết nối', 'Manage Connections')}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>
          {connections.length} {tr('kết nối', 'connections')}
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 380, overflow: 'hidden' }}>
        {/* Left pane: list */}
        <div style={{ width: 260, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--pane2)' }}>
          {isLoading ? (
            <div style={{ padding: 12, color: 'var(--text3)', fontSize: 11 }}>{tr('Đang tải…', 'Loading…')}</div>
          ) : connections.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text3)', fontSize: 11 }}>{tr('Chưa có kết nối', 'No connections')}</div>
          ) : (
            connections.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  background: selectedId === c.id ? 'var(--accent-soft)' : 'transparent',
                  color: selectedId === c.id ? 'var(--accent)' : 'var(--text)',
                  borderLeft: selectedId === c.id ? '2px solid var(--accent)' : '2px solid transparent',
                  fontSize: 12,
                }}
              >
                <span>{DB_ICON[c.driverId] ?? '🗄️'}</span>
                <span style={{ fontWeight: selectedId === c.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Right pane: details & actions */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {selectedConn ? (
            <>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 14 }}>{selectedConn.name}</h3>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Driver: {selectedConn.driverId} | Host: {selectedConn.host || 'localhost'}:{selectedConn.port || 'default'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Database: {selectedConn.database || '(default)'} | User: {selectedConn.user || '(none)'}
                </div>
              </div>

              {isDuplicating ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                  <input
                    type="text"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    placeholder={tr('Tên bản sao', 'Copy name')}
                    style={{
                      flex: 1,
                      height: 26,
                      padding: '0 8px',
                      background: 'var(--pane)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  />
                  <button
                    onClick={() => {
                      if (duplicateName.trim()) {
                        duplicateMutation.mutate({ id: selectedConn.id, newName: duplicateName.trim() })
                      }
                    }}
                    style={{
                      height: 26,
                      padding: '0 10px',
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {tr('Lưu', 'Save')}
                  </button>
                  <button
                    onClick={() => setIsDuplicating(false)}
                    style={{
                      height: 26,
                      padding: '0 8px',
                      background: 'transparent',
                      color: 'var(--text3)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    {tr('Huỷ', 'Cancel')}
                  </button>
                </div>
              ) : null}

              <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                {onSelect && (
                  <button
                    onClick={() => onSelect(selectedConn)}
                    style={{
                      height: 28,
                      padding: '0 12px',
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 600,
                    }}
                  >
                    {tr('Chọn', 'Select')}
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDuplicating(true)
                    setDuplicateName(`${selectedConn.name} (Copy)`)
                  }}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: 'transparent',
                    color: 'var(--text2)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11.5,
                  }}
                >
                  {tr('Nhân bản', 'Duplicate')}
                </button>
                <button
                  onClick={() => {
                    if (confirm(tr(`Xoá kết nối "${selectedConn.name}"?`, `Delete connection "${selectedConn.name}"?`))) {
                      deleteMutation.mutate(selectedConn.id)
                    }
                  }}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: 'transparent',
                    color: 'var(--red)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11.5,
                  }}
                >
                  {tr('Xoá', 'Delete')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 12, margin: 'auto' }}>
              {tr('Chọn một kết nối bên trái để xem chi tiết', 'Select a connection on the left to view details')}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 14px', borderTop: '1px solid var(--border)', background: 'var(--pane2)' }}>
        <button
          onClick={onClose}
          style={{
            height: 26,
            padding: '0 14px',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            borderRadius: 4,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 11.5,
          }}
        >
          {tr('Đóng', 'Close')}
        </button>
      </div>
    </Modal>
  )
}
