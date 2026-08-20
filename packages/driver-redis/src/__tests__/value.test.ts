import { describe, expect, it } from 'vitest'
import { toCellValue } from '../value'

describe('Redis Value Normalization', () => {
  it('chuẩn hoá chuỗi thành {k: "str"}', () => {
    expect(toCellValue('hello world')).toEqual({
      k: 'str',
      v: 'hello world',
    })
  })

  it('chuẩn hoá số thành {k: "num"}', () => {
    expect(toCellValue(42)).toEqual({
      k: 'num',
      v: 42,
    })
  })

  it('chuẩn hoá Buffer thành {k: "bytes", v: hexString}', () => {
    const buf = Buffer.from([0x01, 0x02, 0x03])
    expect(toCellValue(buf)).toEqual({
      k: 'bytes',
      v: '010203',
    })
  })

  it('chuẩn hoá Array thành {k: "json"}', () => {
    const arr = ['item1', 'item2']
    expect(toCellValue(arr)).toEqual({
      k: 'json',
      v: arr,
    })
  })
})
