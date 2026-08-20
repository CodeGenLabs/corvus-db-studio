import { describe, expect, it } from 'vitest'
import { toCellValue } from '../value'

describe('MSSQL Value Normalization (T070)', () => {
  it('giữ nguyên độ chính xác của bigint và decimal/numeric/money qua chuỗi {k: "big"}', () => {
    expect(toCellValue('9223372036854775807', 'bigint')).toEqual({
      k: 'big',
      v: '9223372036854775807',
    })
    expect(toCellValue(9223372036854775807n)).toEqual({
      k: 'big',
      v: '9223372036854775807',
    })
    expect(toCellValue('12345678901234567890.0123456789', 'decimal(30,10)')).toEqual({
      k: 'big',
      v: '12345678901234567890.0123456789',
    })
  })

  it('chuyển đổi buffer / binary sang {k: "bytes", v: hexString}', () => {
    const buf = Buffer.from([0x00, 0xde, 0xad, 0xbe, 0xef])
    expect(toCellValue(buf)).toEqual({
      k: 'bytes',
      v: '00deadbeef',
    })
  })

  it('chuyển đổi bit sang {k: "bool"}', () => {
    expect(toCellValue(true)).toEqual({ k: 'bool', v: true })
    expect(toCellValue(false)).toEqual({ k: 'bool', v: false })
    expect(toCellValue('1', 'bit')).toEqual({ k: 'bool', v: true })
    expect(toCellValue('0', 'bit')).toEqual({ k: 'bool', v: false })
  })

  it('chuyển đổi Date sang {k: "date", v: ISOString}', () => {
    const d = new Date('2026-08-20T09:00:00.000Z')
    expect(toCellValue(d)).toEqual({
      k: 'date',
      v: '2026-08-20T09:00:00.000Z',
    })
  })

  it('xử lý null và undefined chuẩn xác', () => {
    expect(toCellValue(null)).toEqual({ k: 'null' })
    expect(toCellValue(undefined)).toEqual({ k: 'null' })
  })
})
