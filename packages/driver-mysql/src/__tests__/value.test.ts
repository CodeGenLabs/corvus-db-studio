import { describe, expect, it } from 'vitest'
import { alignForMysqlType, MYSQL_TYPE, toCellValue } from '../value'

describe('MySQL toCellValue', () => {
  it('phân biệt NULL và chuỗi rỗng', () => {
    expect(toCellValue(null)).toEqual({ k: 'null' })
    expect(toCellValue(undefined)).toEqual({ k: 'null' })
    expect(toCellValue('')).toEqual({ k: 'str', v: '' })
  })

  it('BIGINT và DECIMAL luôn giữ nguyên chuỗi để không mất chính xác (BẪY 2)', () => {
    const bigVal = '9223372036854775807'
    expect(toCellValue(bigVal, MYSQL_TYPE.LONGLONG)).toEqual({ k: 'big', v: bigVal })
    expect(toCellValue(bigVal, undefined, 'bigint')).toEqual({ k: 'big', v: bigVal })

    const decimalVal = '12345678901234567890.0123456789'
    expect(toCellValue(decimalVal, MYSQL_TYPE.NEWDECIMAL)).toEqual({ k: 'big', v: decimalVal })
    expect(toCellValue(decimalVal, MYSQL_TYPE.DECIMAL)).toEqual({ k: 'big', v: decimalVal })
    expect(toCellValue(decimalVal, undefined, 'decimal(30,10)')).toEqual({ k: 'big', v: decimalVal })
  })

  it('chuyển đổi BIT(1) và TINYINT(1) / boolean thành { k: "bool" }', () => {
    expect(toCellValue(1, MYSQL_TYPE.BIT)).toEqual({ k: 'bool', v: true })
    expect(toCellValue(0, MYSQL_TYPE.BIT)).toEqual({ k: 'bool', v: false })
    expect(toCellValue(Buffer.from([1]), MYSQL_TYPE.BIT)).toEqual({ k: 'bool', v: true })
    expect(toCellValue(Buffer.from([0]), MYSQL_TYPE.BIT)).toEqual({ k: 'bool', v: false })
    expect(toCellValue(1, undefined, 'tinyint(1)')).toEqual({ k: 'bool', v: true })
    expect(toCellValue(0, undefined, 'tinyint(1)')).toEqual({ k: 'bool', v: false })
    expect(toCellValue(true, undefined, 'boolean')).toEqual({ k: 'bool', v: true })
    expect(toCellValue(false, undefined, 'boolean')).toEqual({ k: 'bool', v: false })
  })

  it('chuyển đổi BLOB và Buffer thành { k: "bytes", v: hex }', () => {
    const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef])
    expect(toCellValue(buf)).toEqual({ k: 'bytes', v: 'deadbeef' })
    expect(toCellValue(buf, MYSQL_TYPE.BLOB)).toEqual({ k: 'bytes', v: 'deadbeef' })
    expect(toCellValue('deadbeef', MYSQL_TYPE.BLOB)).toEqual({ k: 'bytes', v: 'deadbeef' })
  })

  it('chuyển đổi JSON thành { k: "json", v: object }', () => {
    const jsonStr = '{"a":[1,2,3]}'
    expect(toCellValue(jsonStr, MYSQL_TYPE.JSON)).toEqual({ k: 'json', v: { a: [1, 2, 3] } })
    expect(toCellValue({ a: [1, 2, 3] }, MYSQL_TYPE.JSON)).toEqual({ k: 'json', v: { a: [1, 2, 3] } })
    // Fallback text nếu JSON lỗi
    expect(toCellValue('invalid json', MYSQL_TYPE.JSON)).toEqual({ k: 'str', v: 'invalid json' })
  })

  it('chuyển đổi DATE, DATETIME, TIMESTAMP thành { k: "date" }', () => {
    const dt = '2026-08-18 09:00:00'
    expect(toCellValue(dt, MYSQL_TYPE.DATETIME)).toEqual({ k: 'date', v: dt })
    expect(toCellValue(dt, MYSQL_TYPE.TIMESTAMP)).toEqual({ k: 'date', v: dt })
    expect(toCellValue('2026-08-18', MYSQL_TYPE.DATE)).toEqual({ k: 'date', v: '2026-08-18' })
  })

  it('chuyển đổi kiểu số an toàn thành { k: "num" }', () => {
    expect(toCellValue(42, MYSQL_TYPE.LONG)).toEqual({ k: 'num', v: 42 })
    expect(toCellValue('42', MYSQL_TYPE.SHORT)).toEqual({ k: 'num', v: 42 })
    expect(toCellValue(3.14, MYSQL_TYPE.FLOAT)).toEqual({ k: 'num', v: 3.14 })
    expect(toCellValue(2.718, MYSQL_TYPE.DOUBLE)).toEqual({ k: 'num', v: 2.718 })
  })

  it('cung cấp gợi ý căn lề cột phù hợp', () => {
    expect(alignForMysqlType(MYSQL_TYPE.LONG)).toBe('r')
    expect(alignForMysqlType(MYSQL_TYPE.LONGLONG)).toBe('r')
    expect(alignForMysqlType(MYSQL_TYPE.NEWDECIMAL)).toBe('r')
    expect(alignForMysqlType(MYSQL_TYPE.DATETIME)).toBe('m')
    expect(alignForMysqlType(MYSQL_TYPE.BLOB)).toBe('m')
    expect(alignForMysqlType(MYSQL_TYPE.VAR_STRING)).toBe('t')
  })
})
