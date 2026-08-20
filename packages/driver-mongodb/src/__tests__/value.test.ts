import { describe, expect, it } from 'vitest'
import { ObjectId, Decimal128, Long, Binary } from 'mongodb'
import { toCellValue } from '../value'

describe('MongoDB Value Normalization', () => {
  it('chuẩn hoá ObjectId thành chuỗi hex {k: "str"}', () => {
    const oid = new ObjectId('507f1f77bcf86cd799439011')
    expect(toCellValue(oid)).toEqual({
      k: 'str',
      v: '507f1f77bcf86cd799439011',
    })
  })

  it('chuẩn hoá Decimal128 và Long thành {k: "big"}', () => {
    const dec = Decimal128.fromString('12345678901234567890.0123456789')
    const long = Long.fromString('9223372036854775807')
    expect(toCellValue(dec)).toEqual({
      k: 'big',
      v: '12345678901234567890.0123456789',
    })
    expect(toCellValue(long)).toEqual({
      k: 'big',
      v: '9223372036854775807',
    })
  })

  it('chuẩn hoá Binary thành {k: "bytes", v: hexString}', () => {
    const bin = new Binary(Buffer.from([0xde, 0xad, 0xbe, 0xef]))
    expect(toCellValue(bin)).toEqual({
      k: 'bytes',
      v: 'deadbeef',
    })
  })

  it('chuẩn hoá Array và Nested Document thành {k: "json"}', () => {
    const obj = { name: 'Corvus', tags: ['db', 'studio'] }
    expect(toCellValue(obj)).toEqual({
      k: 'json',
      v: obj,
    })
  })
})
