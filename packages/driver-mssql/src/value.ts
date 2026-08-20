import type { CellValue } from '@corvus/contract'

/**
 * Chuẩn hoá một giá trị từ kết quả truy vấn SQL Server sang CellValue chuẩn (T070).
 *
 * Quy tắc chuẩn hoá:
 *   - bigint, decimal, numeric, money, smallmoney LUÔN là { k: 'big', v: string } để không mất chữ số.
 *   - Buffer, Uint8Array (varbinary/binary/image) chuyển sang { k: 'bytes', v: hexString }.
 *   - bit chuyển sang { k: 'bool', v: boolean }.
 *   - Date/datetime/datetime2/datetimeoffset chuyển sang { k: 'date', v: ISOString }.
 *   - uniqueidentifier, nvarchar, varchar, text chuyển sang { k: 'str', v: string }.
 *   - null / undefined chuyển sang { k: 'null' }.
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
    if (
      dt.includes('bigint') ||
      dt.includes('decimal') ||
      dt.includes('numeric') ||
      dt.includes('money')
    ) {
      return { k: 'big', v: String(raw) }
    }
    return { k: 'num', v: raw }
  }

  if (typeof raw === 'string') {
    if (dt.includes('bit')) {
      return { k: 'bool', v: raw === '1' || raw.toLowerCase() === 'true' }
    }
    if (
      dt.includes('bigint') ||
      dt.includes('decimal') ||
      dt.includes('numeric') ||
      dt.includes('money')
    ) {
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
