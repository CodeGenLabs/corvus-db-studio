export type View = 'objects' | 'data' | 'sql' | 'design' | 'er' | 'compare' | 'backup' | 'jobs'

export type InfoTab = 'info' | 'ddl' | 'activity' | 'ai'

export type DialogId = 'settings' | 'about' | 'updates' | 'users' | null

export type MenuKey = 'file' | 'edit' | 'view' | 'tools' | 'window' | 'help'

export type SettingsSection = 'general' | 'appearance' | 'editor' | 'grid' | 'conn' | 'ai'

export type Density = 'compact' | 'comfortable'

export type MonoKey = 'plex' | 'mplus' | 'noto' | 'jb' | 'system'

export type NodeKind = 'conn' | 'db' | 'folder' | 'table'

export interface TreeNode {
  label: string
  meta: string
  depth: number
  kind: NodeKind
  children?: TreeNode[]
}

/** One row of `information_schema.tables`, in the order the objects grid renders it. */
export type TableRow = readonly [
  name: string,
  rows: string,
  size: string,
  engine: string,
  autoinc: string,
  modified: string,
]

export interface Dataset {
  cols: string[]
  /** Per-column rendering hint: `r` = numeric (right), `t` = text, `m` = mono. */
  align: ('r' | 't' | 'm')[]
  widths: string[]
  total: string
  rows: string[][]
}

export interface FieldDef {
  name: string
  ddl: string
  type: string
  len: string
  notNull: boolean
  key: string
  def: string
}

export interface FilterCriterion {
  join: string
  field: string
  op: string
  value: string
}

export interface SortCriterion {
  field: string
  dir: 'ASC' | 'DESC'
}

export interface BackupOptions {
  compress: boolean
  routines: boolean
  dataOnly: boolean
  verify: boolean
}

export type BackupScope = 'full' | 'tables' | 'schema'

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
