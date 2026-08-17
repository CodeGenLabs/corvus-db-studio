export type SettingsSection = 'general' | 'appearance' | 'editor' | 'grid' | 'conn' | 'ai'

export type Density = 'compact' | 'comfortable'

export type MonoKey = 'plex' | 'mplus' | 'noto' | 'jb' | 'system'

export interface Config {
  autoCommit: boolean
  confirmDelete: boolean
  sqlUpper: boolean
  sslDefault: boolean
  showLineNos: boolean
  fontSize: number
  rowLimit: number
  timeout: number
  keymap: 'default' | 'vim'
  aiModel: string
  autoUpdate: boolean
  /**
   * Separate from `sslDefault`. The source design bound the AI "allow schema
   * access" switch to `sslDefault`, which made the two settings move together.
   */
  aiSchemaAccess: boolean
  gridNull: 'highlight' | 'plain'
  startupView: 'objects' | 'sql'
  density: Density
  mono: MonoKey
}
