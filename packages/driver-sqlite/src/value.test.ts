import { describe, expect, it } from 'vitest'
import { SQLITE_MAPPED_CODE_COUNT, sqliteErrorToCorvus } from './errors'
import { alignForDeclaredType, kindOfDeclaredType, toCellValue } from './value'

describe('driver-sqlite · kindOfDeclaredType', () => {
  it('nhận đúng nhóm theo luật affinity của SQLite', () => {
    expect(kindOfDeclaredType('INTEGER')).toBe('int')
    expect(kindOfDeclaredType('BIGINT')).toBe('int')
    expect(kindOfDeclaredType('VARCHAR(50)')).toBe('text')
    expect(kindOfDeclaredType('CLOB')).toBe('text')
    expect(kindOfDeclaredType('BLOB')).toBe('blob')
    expect(kindOfDeclaredType('REAL')).toBe('real')
    expect(kindOfDeclaredType('DOUBLE PRECISION')).toBe('real')
    expect(kindOfDeclaredType('NUMERIC(30,10)')).toBe('exact')
    expect(kindOfDeclaredType('DECIMAL')).toBe('exact')
  })

  it('BOOLEAN / JSON / DATETIME được xét TRƯỚC nhóm INT', () => {
    // 'BIGINT' chứa 'INT'; nếu thứ tự kiểm sai thì các tên quy ước dưới đây rơi sai nhóm.
    expect(kindOfDeclaredType('BOOLEAN')).toBe('bool')
    expect(kindOfDeclaredType('JSON')).toBe('json')
    expect(kindOfDeclaredType('JSONB')).toBe('json')
    expect(kindOfDeclaredType('DATETIME')).toBe('date')
    expect(kindOfDeclaredType('TIMESTAMP')).toBe('date')
  })

  it('cột biểu thức (không có kiểu khai báo) là unknown', () => {
    expect(kindOfDeclaredType(null)).toBe('unknown')
    expect(kindOfDeclaredType(undefined)).toBe('unknown')
    expect(kindOfDeclaredType('')).toBe('unknown')
  })
})

describe('driver-sqlite · toCellValue', () => {
  it('NULL khác chuỗi rỗng', () => {
    expect(toCellValue(null, 'TEXT')).toEqual({ k: 'null' })
    expect(toCellValue('', 'TEXT')).toEqual({ k: 'str', v: '' })
  })

  it('số nguyên vượt 2^53 giữ dạng string, không mất chữ số', () => {
    expect(toCellValue(9223372036854775807n, 'INTEGER')).toEqual({
      k: 'big',
      v: '9223372036854775807',
    })
    expect(toCellValue(-9223372036854775808n, 'INTEGER')).toEqual({
      k: 'big',
      v: '-9223372036854775808',
    })
  })

  it('số nguyên nhỏ về number cho UI dùng trực tiếp', () => {
    expect(toCellValue(42n, 'INTEGER')).toEqual({ k: 'num', v: 42 })
  })

  it('cột khai INTEGER nhưng đang giữ chuỗi thì KHÔNG ép kiểu', () => {
    // SQLite cho phép lệch kiểu. Ép về số sẽ che mất việc dữ liệu bị lệch, và người dùng
    // không bao giờ biết để sửa.
    expect(toCellValue('không phải số', 'INTEGER')).toEqual({ k: 'str', v: 'không phải số' })
  })

  it('cột BOOLEAN đọc 0/1 thành boolean thật', () => {
    expect(toCellValue(1n, 'BOOLEAN')).toEqual({ k: 'bool', v: true })
    expect(toCellValue(0n, 'BOOLEAN')).toEqual({ k: 'bool', v: false })
  })

  it("chuỗi '123' trong cột TEXT KHÔNG bị biến thành số", () => {
    expect(toCellValue('123', 'TEXT')).toEqual({ k: 'str', v: '123' })
  })

  it('cột NUMERIC: chuỗi thì giữ nguyên chữ số, REAL thì thừa nhận là số thực', () => {
    expect(toCellValue('12345678901234567890.0123456789', 'NUMERIC')).toEqual({
      k: 'big',
      v: '12345678901234567890.0123456789',
    })
    // SQLite đã hạ giá trị xuống REAL → chữ số mất từ trước; khai `{k:'big'}` ở đây là
    // nói với UI rằng con số chính xác trong khi nó không còn chính xác.
    // Dựng số qua Number() thay vì viết literal: literal đủ dài bị chính TypeScript/ESLint
    // chặn vì "mất chính xác lúc chạy" — đúng cái mà test này muốn nói.
    const asReal = Number('12345678901234567890.0123456789')
    expect(toCellValue(asReal, 'NUMERIC')).toEqual({ k: 'num', v: asReal })
  })

  it('BLOB về hex', () => {
    expect(toCellValue(Buffer.from('deadbeef', 'hex'), 'BLOB')).toEqual({
      k: 'bytes',
      v: 'deadbeef',
    })
  })

  it('JSON hợp lệ được parse, JSON hỏng hiện nguyên văn thay vì làm sập việc đọc', () => {
    expect(toCellValue('{"a":[1,2]}', 'JSON')).toEqual({ k: 'json', v: { a: [1, 2] } })
    expect(toCellValue('{hỏng', 'JSON')).toEqual({ k: 'str', v: '{hỏng' })
  })

  it('cột biểu thức suy từ giá trị — ngoại lệ duy nhất được phép', () => {
    expect(toCellValue(7n, null)).toEqual({ k: 'num', v: 7 })
    expect(toCellValue('xin chào', null)).toEqual({ k: 'str', v: 'xin chào' })
    expect(toCellValue(Buffer.from('ff', 'hex'), null)).toEqual({ k: 'bytes', v: 'ff' })
  })
})

describe('driver-sqlite · alignForDeclaredType', () => {
  it('số căn phải, ngày/BLOB căn giữa, còn lại căn trái', () => {
    expect(alignForDeclaredType('INTEGER')).toBe('r')
    expect(alignForDeclaredType('NUMERIC')).toBe('r')
    expect(alignForDeclaredType('DATETIME')).toBe('m')
    expect(alignForDeclaredType('BLOB')).toBe('m')
    expect(alignForDeclaredType('TEXT')).toBe('t')
  })
})

describe('driver-sqlite · sqliteErrorToCorvus', () => {
  it('ánh xạ đủ ≥ 20 mã như driver-spi §7 yêu cầu', () => {
    expect(SQLITE_MAPPED_CODE_COUNT).toBeGreaterThanOrEqual(20)
  })

  it('phân biệt trùng khoá với vi phạm khoá ngoại', () => {
    expect(sqliteErrorToCorvus({ code: 'SQLITE_CONSTRAINT_UNIQUE', message: 'x' }).code).toBe(
      'DUPLICATE_KEY',
    )
    expect(sqliteErrorToCorvus({ code: 'SQLITE_CONSTRAINT_FOREIGNKEY', message: 'x' }).code).toBe(
      'FOREIGN_KEY_VIOLATION',
    )
    // Mã cơ bản một mình không phân biệt được hai cái trên — đó là lý do bảng tra mã mở rộng.
    expect(sqliteErrorToCorvus({ code: 'SQLITE_CONSTRAINT', message: 'x' }).code).toBe('INVALID_INPUT')
  })

  it('SQLITE_ERROR được phân loại tiếp bằng thông báo', () => {
    expect(sqliteErrorToCorvus({ code: 'SQLITE_ERROR', message: 'no such table: abc' }).code).toBe(
      'TABLE_NOT_FOUND',
    )
    expect(sqliteErrorToCorvus({ code: 'SQLITE_ERROR', message: 'no such column: x' }).code).toBe(
      'COLUMN_NOT_FOUND',
    )
    expect(
      sqliteErrorToCorvus({ code: 'SQLITE_ERROR', message: 'near "SELEKT": syntax error' }).code,
    ).toBe('SYNTAX_ERROR')
  })

  it('mã mở rộng chưa có trong bảng rơi về mã cơ bản', () => {
    expect(sqliteErrorToCorvus({ code: 'SQLITE_IOERR_SHORT_READ', message: 'x' }).code).toBe(
      'INTERNAL_ERROR',
    )
    expect(sqliteErrorToCorvus({ code: 'SQLITE_READONLY_KHONG_CO_THAT', message: 'x' }).code).toBe(
      'READ_ONLY',
    )
  })

  it('không đính lỗi gốc vào cause — đường dẫn tệp hay lọt ra qua đó', () => {
    const original = new Error('SQLITE_CANTOPEN: D:/du-lieu-mat/khach-hang.db')
    const mapped = sqliteErrorToCorvus({ code: 'SQLITE_CANTOPEN', message: 'không mở được' })
    expect(mapped.code).toBe('CONNECTION_FAILED')
    expect(mapped.cause).toBeUndefined()
    // Đường dẫn chỉ xuất hiện nếu chính thông báo mang nó; ta không thêm vào.
    expect(JSON.stringify(mapped.toJSON())).not.toContain(original.message)
  })

  it('CorvusError đi qua nguyên vẹn, không bị bọc hai lần', () => {
    const inner = sqliteErrorToCorvus({ code: 'SQLITE_BUSY', message: 'busy' })
    expect(sqliteErrorToCorvus(inner)).toBe(inner)
  })
})
