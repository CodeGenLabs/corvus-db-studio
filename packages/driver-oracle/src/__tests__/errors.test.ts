import { describe, expect, it } from 'vitest'
import { toCorvusError } from '../errors'

describe('Oracle Error Mapping', () => {
  it('ánh xạ bảng không tồn tại (ORA-00942) -> TABLE_NOT_FOUND', () => {
    const err = toCorvusError({ errorNum: 942, message: 'ORA-00942: table or view does not exist' })
    expect(err.code).toBe('TABLE_NOT_FOUND')
  })

  it('ánh xạ cột không tồn tại (ORA-00904) -> COLUMN_NOT_FOUND', () => {
    const err = toCorvusError({ errorNum: 904, message: 'ORA-00904: "INVALID_COL": invalid identifier' })
    expect(err.code).toBe('COLUMN_NOT_FOUND')
  })

  it('ánh xạ trùng unique constraint (ORA-00001) -> DUPLICATE_KEY', () => {
    const err = toCorvusError({ errorNum: 1, message: 'ORA-00001: unique constraint violated' })
    expect(err.code).toBe('DUPLICATE_KEY')
  })

  it('ánh xạ vi phạm khoá ngoại (ORA-02291) -> FOREIGN_KEY_VIOLATION', () => {
    const err = toCorvusError({ errorNum: 2291, message: 'ORA-02291: integrity constraint violated - parent key not found' })
    expect(err.code).toBe('FOREIGN_KEY_VIOLATION')
  })

  it('ánh xạ lỗi sai cú pháp (ORA-00933, ORA-00900) -> SYNTAX_ERROR', () => {
    const err1 = toCorvusError({ errorNum: 933, message: 'ORA-00933: SQL command not properly ended' })
    const err2 = toCorvusError({ errorNum: 900, message: 'ORA-00900: invalid SQL statement' })
    expect(err1.code).toBe('SYNTAX_ERROR')
    expect(err2.code).toBe('SYNTAX_ERROR')
  })

  it('ánh xạ huỷ truy vấn (ORA-01013) -> QUERY_CANCELLED', () => {
    const err = toCorvusError({ errorNum: 1013, message: 'ORA-01013: user requested cancel of current operation' })
    expect(err.code).toBe('QUERY_CANCELLED')
  })
})
