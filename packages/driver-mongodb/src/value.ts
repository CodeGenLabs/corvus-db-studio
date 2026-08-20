import type { CellValue } from '@corvus/contract'
import { ObjectId, Decimal128, Long, Binary } from 'mongodb'

/**
 * Chuẩn hoá một giá trị từ BSON Document của MongoDB sang CellValue chuẩn.
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

  if (raw instanceof Long) {
    return { k: 'big', v: raw.toString() }
  }

  if (raw instanceof Decimal128) {
    return { k: 'big', v: raw.toString() }
  }

  if (raw instanceof ObjectId) {
    return { k: 'str', v: raw.toHexString() }
  }

  if (raw instanceof Binary) {
    return { k: 'bytes', v: Buffer.from(raw.buffer).toString('hex') }
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
    return { k: 'num', v: raw }
  }

  if (typeof raw === 'string') {
    return { k: 'str', v: raw }
  }

  if (raw instanceof RegExp) {
    return { k: 'str', v: raw.toString() }
  }

  if (Array.isArray(raw) || typeof raw === 'object') {
    return { k: 'json', v: raw }
  }

  return { k: 'str', v: String(raw) }
}
