export interface BackupOptions {
  compress: boolean
  routines: boolean
  dataOnly: boolean
  verify: boolean
}

export type BackupScope = 'full' | 'tables' | 'schema'
