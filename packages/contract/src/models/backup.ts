export interface BackupOptions {
  compress: boolean
  routines: boolean
  dataOnly: boolean
  verify: boolean
}

export type BackupScope = 'full' | 'tables' | 'schema'

export interface BackupHeader {
  version: string
  connectionName: string
  driverId: string
  database: string
  scope: BackupScope
  createdAt: string
  tablesCount: number
  compressed: boolean
  checksum: string
}

export interface BackupHistoryItem {
  id: string
  filename: string
  size: string
  scope: BackupScope
  status: 'ok' | 'warn' | 'fail' | 'running'
  date: string
  duration: string
  tablesCount?: number
}
