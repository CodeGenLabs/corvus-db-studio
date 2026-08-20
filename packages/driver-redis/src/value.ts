import type { CellValue } from '@corvus/contract'

/**
 * Chuẩn hoá một giá trị từ Redis sang CellValue chuẩn.
 */
export function toCellValue(raw: unknown): CellValue {
  if (raw === null || raw === undefined) {
    return { k: 'null' }
  }

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

  if (typeof raw === 'number') {
    return { k: 'num', v: raw }
  }

  if (typeof raw === 'string') {
    return { k: 'str', v: raw }
  }

  if (Array.isArray(raw) || typeof raw === 'object') {
    return { k: 'json', v: raw }
  }

  return { k: 'str', v: String(raw) }
}
