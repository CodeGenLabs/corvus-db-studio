import type { ConnectionProfile } from '@corvus/contract'

export interface ConnectionBackupFile {
  $schema?: string
  version: number
  exportedAt: string
  connections: ConnectionProfile[]
}

export interface ParseConnectionsResult {
  valid: boolean
  connections: ConnectionProfile[]
  error?: string
}

/**
 * Tuần tự hoá danh sách kết nối thành tệp sao lưu JSON chuẩn Corvus.
 */
export function serializeConnectionsBackup(connections: ConnectionProfile[]): string {
  const payload: ConnectionBackupFile = {
    $schema: 'https://corvus-db.org/schema/v1/connections.json',
    version: 1,
    exportedAt: new Date().toISOString(),
    connections,
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Phân tích và kiểm tra tính hợp lệ của tệp sao lưu JSON kết nối.
 */
export function parseConnectionsBackup(jsonStr: string): ParseConnectionsResult {
  try {
    const raw = JSON.parse(jsonStr)
    let list: unknown[]

    if (Array.isArray(raw)) {
      list = raw
    } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).connections)) {
      list = (raw as any).connections
    } else {
      return {
        valid: false,
        connections: [],
        error: 'Tệp không đúng định dạng sao lưu kết nối Corvus (thiếu mảng connections).',
      }
    }

    const validProfiles: ConnectionProfile[] = []
    for (const item of list) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        if (typeof obj.name === 'string' && typeof obj.driverId === 'string') {
          validProfiles.push({
            id: typeof obj.id === 'string' && obj.id ? obj.id : `imported-${Math.random().toString(36).slice(2, 9)}`,
            name: obj.name,
            driverId: obj.driverId as any,
            host: typeof obj.host === 'string' ? obj.host : undefined,
            port: typeof obj.port === 'number' ? obj.port : undefined,
            database: typeof obj.database === 'string' ? obj.database : undefined,
            user: typeof obj.user === 'string' ? obj.user : undefined,
            color: typeof obj.color === 'string' ? obj.color : undefined,
            group: typeof obj.group === 'string' ? obj.group : undefined,
            readOnly: typeof obj.readOnly === 'boolean' ? obj.readOnly : undefined,
            ssl: obj.ssl as any,
            ssh: obj.ssh as any,
          })
        }
      }
    }

    if (validProfiles.length === 0) {
      return {
        valid: false,
        connections: [],
        error: 'Không tìm thấy cấu hình kết nối hợp lệ nào trong tệp.',
      }
    }

    return {
      valid: true,
      connections: validProfiles,
    }
  } catch (err: any) {
    return {
      valid: false,
      connections: [],
      error: `Lỗi đọc JSON: ${err?.message || 'Dữ liệu không hợp lệ'}`,
    }
  }
}

/**
 * Tải xuống tệp sao lưu kết nối trên trình duyệt / Desktop renderer.
 */
export function exportConnectionsFile(connections: ConnectionProfile[], filename?: string): void {
  const jsonContent = serializeConnectionsBackup(connections)
  const dateStr = new Date().toISOString().slice(0, 10)
  const finalName = filename || `corvus-connections-backup-${dateStr}.json`

  if (typeof document !== 'undefined') {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = finalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}