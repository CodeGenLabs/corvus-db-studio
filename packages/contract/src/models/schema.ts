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

export interface ColumnMeta {
  name: string
  dataType: string
  nullable: boolean
  defaultValue?: string | null
  isPrimaryKey: boolean
  isAutoIncrement?: boolean
  comment?: string
  ordinalPosition: number
}

export interface IndexMeta {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
  type?: string
}

export interface ForeignKeyMeta {
  name: string
  column: string
  referencedTable: string
  referencedColumn: string
  onUpdate?: string
  onDelete?: string
}

export interface TableMeta {
  name: string
  schema?: string
  columns: ColumnMeta[]
  indexes: IndexMeta[]
  foreignKeys: ForeignKeyMeta[]
  rowCount?: number
  sizeBytes?: number
  engine?: string
  comment?: string
}
