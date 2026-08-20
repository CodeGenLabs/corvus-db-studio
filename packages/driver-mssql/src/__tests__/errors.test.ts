import { describe, expect, it } from 'vitest'
import { toCorvusError } from '../errors'

describe('MSSQL Error Mapping (T069)', () => {
  it('ánh xạ mã lỗi bảng không tồn tại (208) -> TABLE_NOT_FOUND', () => {
    const err = toCorvusError({ number: 208, message: "Invalid object name 'foo'" })
    expect(err.code).toBe('TABLE_NOT_FOUND')
  })

  it('ánh xạ mã lỗi cột không tồn tại (207) -> COLUMN_NOT_FOUND', () => {
    const err = toCorvusError({ number: 207, message: "Invalid column name 'bar'" })
    expect(err.code).toBe('COLUMN_NOT_FOUND')
  })

  it('ánh xạ mã lỗi trùng khoá chính/unique (2627, 2601) -> DUPLICATE_KEY', () => {
    const err1 = toCorvusError({ number: 2627, message: 'Violation of PRIMARY KEY' })
    const err2 = toCorvusError({ number: 2601, message: 'Cannot insert duplicate key row' })
    expect(err1.code).toBe('DUPLICATE_KEY')
    expect(err2.code).toBe('DUPLICATE_KEY')
  })

  it('ánh xạ mã lỗi khoá ngoại (547) -> FOREIGN_KEY_VIOLATION', () => {
    const err = toCorvusError({ number: 547, message: 'The INSERT statement conflicted with the FOREIGN KEY' })
    expect(err.code).toBe('FOREIGN_KEY_VIOLATION')
  })

  it('ánh xạ mã lỗi sai cú pháp (102, 156) -> SYNTAX_ERROR', () => {
    const err1 = toCorvusError({ number: 102, message: 'Incorrect syntax near' })
    const err2 = toCorvusError({ number: 156, message: 'Incorrect syntax near keyword' })
    expect(err1.code).toBe('SYNTAX_ERROR')
    expect(err2.code).toBe('SYNTAX_ERROR')
  })

  it('ánh xạ huỷ truy vấn (ECANCEL) -> QUERY_CANCELLED', () => {
    const err = toCorvusError({ code: 'ECANCEL', message: 'Canceled' })
    expect(err.code).toBe('QUERY_CANCELLED')
  })
})
