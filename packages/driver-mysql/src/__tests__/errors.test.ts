import { describe, expect, it } from 'vitest'
import { mapMysqlError, MYSQL_ERROR_MAP, mysqlErrorToCorvus } from '../errors'

describe('MySQL Error Mapping', () => {
  it('ánh xạ đầy đủ ≥ 20 mã errno của MySQL sang Corvus ErrorCode', () => {
    const errorCodes = Object.keys(MYSQL_ERROR_MAP).map(Number)
    expect(errorCodes.length).toBeGreaterThanOrEqual(20)

    // Kiểm tra từng mã lỗi cụ thể
    expect(mapMysqlError(1045)).toBe('UNAUTHORIZED')
    expect(mapMysqlError(1044)).toBe('FORBIDDEN')
    expect(mapMysqlError(1049)).toBe('NOT_FOUND')
    expect(mapMysqlError(1146)).toBe('TABLE_NOT_FOUND')
    expect(mapMysqlError(1051)).toBe('TABLE_NOT_FOUND')
    expect(mapMysqlError(1054)).toBe('COLUMN_NOT_FOUND')
    expect(mapMysqlError(1091)).toBe('COLUMN_NOT_FOUND')
    expect(mapMysqlError(1064)).toBe('SYNTAX_ERROR')
    expect(mapMysqlError(1062)).toBe('DUPLICATE_KEY')
    expect(mapMysqlError(1007)).toBe('DUPLICATE_KEY')
    expect(mapMysqlError(1050)).toBe('DUPLICATE_KEY')
    expect(mapMysqlError(1061)).toBe('DUPLICATE_KEY')
    expect(mapMysqlError(1216)).toBe('FOREIGN_KEY_VIOLATION')
    expect(mapMysqlError(1217)).toBe('FOREIGN_KEY_VIOLATION')
    expect(mapMysqlError(1451)).toBe('FOREIGN_KEY_VIOLATION')
    expect(mapMysqlError(1452)).toBe('FOREIGN_KEY_VIOLATION')
    expect(mapMysqlError(1048)).toBe('INVALID_INPUT')
    expect(mapMysqlError(1406)).toBe('INVALID_INPUT')
    expect(mapMysqlError(1317)).toBe('QUERY_CANCELLED')
    expect(mapMysqlError(1053)).toBe('CONNECTION_FAILED')
    expect(mapMysqlError(2002)).toBe('CONNECTION_FAILED')
    expect(mapMysqlError(2003)).toBe('CONNECTION_FAILED')
    expect(mapMysqlError(2005)).toBe('CONNECTION_FAILED')
    expect(mapMysqlError(2006)).toBe('CONNECTION_FAILED')
    expect(mapMysqlError(2013)).toBe('CONNECTION_FAILED')
    expect(mapMysqlError(1205)).toBe('LOCK_TIMEOUT')
    expect(mapMysqlError(1213)).toBe('DEADLOCK')
    expect(mapMysqlError(1290)).toBe('READ_ONLY')
  })

  it('ánh xạ errno không xác định thành INTERNAL_ERROR', () => {
    expect(mapMysqlError(99999)).toBe('INTERNAL_ERROR')
    expect(mapMysqlError(undefined)).toBe('INTERNAL_ERROR')
  })

  it('chuyển đổi lỗi mạng của Node thành CorvusError phù hợp', () => {
    const errConnRefused = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:3306' }
    const res1 = mysqlErrorToCorvus(errConnRefused)
    expect(res1.code).toBe('CONNECTION_FAILED')
    expect(res1.detail).toBe('ECONNREFUSED')

    const errTimeout = { code: 'ETIMEDOUT', message: 'connection timed out' }
    const res2 = mysqlErrorToCorvus(errTimeout)
    expect(res2.code).toBe('QUERY_TIMEOUT')

    const errHostNotFound = { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND invalid.host' }
    const res3 = mysqlErrorToCorvus(errHostNotFound)
    expect(res3.code).toBe('CONNECTION_FAILED')
  })

  it('không làm rò rỉ secret / password trong message hoặc detail', () => {
    const secretPassword = 'SUPER_SECRET_PASSWORD_123!'
    const errWithSecret = {
      code: 'ER_ACCESS_DENIED_ERROR',
      errno: 1045,
      sqlState: '28000',
      sqlMessage: `Access denied for user 'root'@'localhost' (using password: YES)`,
      message: `Failed to connect with password ${secretPassword}`,
    }

    const res = mysqlErrorToCorvus(errWithSecret)
    expect(res.code).toBe('UNAUTHORIZED')
    expect(res.message).not.toContain(secretPassword)
    expect(res.detail).not.toContain(secretPassword)
  })
})
