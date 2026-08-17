import type { CellValue } from '@corvus/contract'

export function renderCellValue(val: CellValue | undefined | null): string {
  if (val === undefined || val === null) return 'NULL'
  if (typeof val === 'object') {
    if ('k' in val) {
      switch (val.k) {
        case 'null':
          return 'NULL'
        case 'missing':
          return '—'
        case 'str':
          return val.v
        case 'num':
          return String(val.v)
        case 'big':
          return val.v
        case 'bool':
          return val.v ? 'TRUE' : 'FALSE'
        case 'date':
          return val.v
        case 'json':
          return JSON.stringify(val.v)
        case 'bytes':
          return `<BLOB ${val.v.length}B>`
        default:
          return String((val as any).v ?? '')
      }
    }
  }
  return String(val)
}

export function isNullValue(val: CellValue | undefined | null): boolean {
  if (val === undefined || val === null) return true
  if (typeof val === 'object' && 'k' in val && val.k === 'null') return true
  return false
}
