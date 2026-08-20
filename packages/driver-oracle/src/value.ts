import type { CellValue } from '@corvus/contract'

/**
 * Chuẩn hoá một giá trị từ kết quả truy vấn Oracle sang CellValue chuẩn.
 *
 * Quy tắc chuẩn hoá:
 *   - NUMBER, BINARY_FLOAT, BINARY_DOUBLE: NUMBER của Oracle có tới 38 chữ số nên LUÔN chuẩn hoá
 *     thành { k: 'big', v: string } nếu là số lớn/decimal, hoặc { k: 'num', v: number }.
 *   - RAW, BLOB: Buffer hoặc Uint8Array chuyển sang { k: 'bytes', v: hexString }.
 *   - DATE, TIMESTAMP: chuyển sang { k: 'date', v: ISOString }.
 *   - VARCHAR2, NVARCHAR2, CHAR, NCHAR, CLOB: chuyển sang { k: 'str', v: string }.
 *   - null / undefined: chuyển sang { k: 'null' }.
 */
export function toCellValue(raw: unknown, declaredType?: string): CellValue {
  if (raw === null || raw === undefined) {
    return { k: 'null' }
  }

  const dt = declaredType ? declaredType.toLowerCase() : ''

  if (typeof raw === 'boolean') {
    return { k: 'bool', v: raw }
  }

  if (typeof raw === 'bigint') {
    return { k: 'big', v: raw.toString() }
  }

  if (Buffer.isBuffer(raw)) {
    return { k: 'bytes', v: raw.toString('hex') }
  }

  if (raw instanceof Uint8Array) {
    return { k: 'bytes', v: Buffer.from(raw).toString('hex') }
  }

  if (raw instanceof Date) {
    return { k: 'date', v: raw.toISOString() }
  }

  if (typeof raw === 'number') {
    if (dt.includes('number') || dt.includes('decimal') || dt.includes('numeric')) {
      return { k: 'big', v: String(raw) }
    }
    return { k: 'num', v: raw }
  }

  if (typeof raw === 'string') {
    if (dt.includes('number') || dt.includes('decimal') || dt.includes('numeric')) {
      return { k: 'big', v: raw }
    }
    if (dt.includes('json')) {
      try {
        return { k: 'json', v: JSON.parse(raw) }
      } catch {
        return { k: 'str', v: raw }
      }
    }
    return { k: 'str', v: raw }
  }

  if (typeof raw === 'object') {
    return { k: 'json', v: raw }
  }

  return { k: 'str', v: String(raw) }
}
