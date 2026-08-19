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
  /**
   * true khi kết quả bị cắt vì đạt `maxRows`.
   *
   * UI PHẢI hiện banner "đã cắt bớt" khi cờ này bật (SPEC-04 FR-04.16) — người dùng cần
   * biết mình đang xem một phần, nếu không họ sẽ kết luận sai về dữ liệu.
   */
  truncated?: boolean
}
