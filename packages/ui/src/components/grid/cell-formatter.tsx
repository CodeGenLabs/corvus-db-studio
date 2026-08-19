import type { CellValue } from '@corvus/contract'

export function renderCellValue(val: CellValue | undefined | null): string {
  if (val === undefined || val === null) return 'NULL'
  if (typeof val === 'object') {
    if ('k' in val) {
      switch (val.k) {
        case 'null':
          return 'NULL'
        case 'missing':
          return '— (missing)'
        case 'str':
          return val.v === '' ? '[chuỗi rỗng]' : val.v
        case 'num':
          return String(val.v)
        case 'big':
          return val.v
        case 'bool':
          return val.v ? 'TRUE' : 'FALSE'
        case 'date':
          return val.v
        case 'json':
          return typeof val.v === 'string' ? val.v : JSON.stringify(val.v)
        case 'bytes':
          return `<BLOB ${val.v.length}B>`
        default: {
          // Mọi biến thể của CellValue đã được xử lý ở trên. Nếu thêm biến thể mới mà
          // quên cập nhật đây, TypeScript sẽ báo lỗi tại dòng này (exhaustive check).
          const exhaustive: never = val
          return String(exhaustive)
        }
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

export function isEmptyStringValue(val: CellValue | undefined | null): boolean {
  return typeof val === 'object' && val !== null && 'k' in val && val.k === 'str' && val.v === ''
}
