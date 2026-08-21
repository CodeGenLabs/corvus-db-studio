import { describe, expect, it } from 'vitest'
import { DEV_DB_ENV, getEffectiveEngineConfig } from '../ports'

describe('devdb · ports specification (T017, FR-003a, SC-002)', () => {
  it('TUYỆT ĐỐI KHÔNG CÓ engine nào sử dụng cổng 1433 (dành riêng cho SQL Server của máy host)', () => {
    for (const [engine, spec] of Object.entries(DEV_DB_ENV)) {
      expect(
        spec.port,
        `Engine "${engine}" không được phép dùng port 1433!`,
      ).not.toBe(1433)
    }
  })

  it('SQL Server trong dev-db phải dùng cổng 1434', () => {
    const mssql = getEffectiveEngineConfig('mssql')
    expect(mssql.port).toBe(1434)
  })

  it('MariaDB (3307) và MySQL (3306) có cổng tách biệt, không xung đột', () => {
    const mysql = getEffectiveEngineConfig('mysql')
    const mariadb = getEffectiveEngineConfig('mariadb')
    expect(mysql.port).toBe(3306)
    expect(mariadb.port).toBe(3307)
    expect(mysql.port).not.toBe(mariadb.port)
  })

  it('Tất cả engine có cấu hình loopback host 127.0.0.1', () => {
    for (const spec of Object.values(DEV_DB_ENV)) {
      if (spec.port) {
        expect(spec.host).toBe('127.0.0.1')
      }
    }
  })

  it('Tất cả 8 engine (7 Docker + 1 SQLite) đều được khai báo đầy đủ', () => {
    const expected = [
      'postgres',
      'mysql',
      'mariadb',
      'mssql',
      'oracle',
      'mongodb',
      'redis',
      'sqlite',
    ]
    expect(Object.keys(DEV_DB_ENV).sort()).toEqual(expected.sort())
  })
})
