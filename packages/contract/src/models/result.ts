import type { QueryStats } from './query'

export type CellValue =
  | { k: 'null' }
  | { k: 'str'; v: string }
  | { k: 'num'; v: number }
  | { k: 'big'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'bytes'; v: string } // hex / base64 encoded
  | { k: 'json'; v: unknown }
  | { k: 'date'; v: string }
  | { k: 'missing' } // mongo

export interface ColumnDef {
  name: string
  type: string
  align?: 'r' | 't' | 'm'
  nullable?: boolean
}

export interface ResultChunk {
  seq: number
  columns?: ColumnDef[]
  rows: unknown[][]
  done: boolean
  stats?: QueryStats
}

export interface QueryResult {
  columns: ColumnDef[]
  rows: unknown[][]
  stats: QueryStats
}
