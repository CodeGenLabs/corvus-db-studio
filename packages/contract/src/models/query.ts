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

export interface QueryStats {
  rowCount: number
  durationMs: number
  affectedRows?: number
}
