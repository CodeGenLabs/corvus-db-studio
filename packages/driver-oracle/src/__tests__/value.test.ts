import { describe, expect, it } from 'vitest'
import { toCellValue } from '../value'

describe('Oracle Value Normalization', () => {
  it('giữ nguyên độ chính xác của NUMBER/DECIMAL bằng cách chuyển sang {k: "big"}', () => {
    expect(toCellValue('9223372036854775807', 'NUMBER(19)')).toEqual({
      k: 'big',
      v: '9223372036854775807',
    })
    expect(toCellValue(9223372036854775807n)).toEqual({
      k: 'big',
      v: '9223372036854775807',
    })
    expect(toCellValue('12345678901234567890.0123456789', 'NUMBER(38,10)')).toEqual({
      k: 'big',
      v: '12345678901234567890.0123456789',
    })
  })

  it('chuyển đổi buffer / RAW / BLOB sang {k: "bytes", v: hexString}', () => {
    const buf = Buffer.from([0x00, 0xca, 0xfe, 0xba, 0xbe])
    expect(toCellValue(buf)).toEqual({
      k: 'bytes',
      v: '00cafebabe',
    })
  })

  it('chuyển đổi Date sang {k: "date", v: ISOString}', () => {
    const d = new Date('2026-08-20T10:00:00.000Z')
    expect(toCellValue(d)).toEqual({
      k: 'date',
      v: '2026-08-20T10:00:00.000Z',
    })
  })

  it('xử lý null và undefined chuẩn xác', () => {
    expect(toCellValue(null)).toEqual({ k: 'null' })
    expect(toCellValue(undefined)).toEqual({ k: 'null' })
  })
})
