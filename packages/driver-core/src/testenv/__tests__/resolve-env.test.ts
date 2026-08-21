import { describe, expect, it } from 'vitest'
import { getEffectiveEngineConfig } from '../resolve'

describe('testenv · resolve environment variables (T051, R-4)', () => {
  it('đọc đúng các biến DEV_DB_* tuỳ biến', () => {
    process.env.DEV_DB_POSTGRES_PORT = '5433'
    process.env.DEV_DB_POSTGRES_DATABASE = 'custom_db'
    process.env.DEV_DB_POSTGRES_USER = 'custom_user'

    try {
      const cfg = getEffectiveEngineConfig('postgres')
      expect(cfg.port).toBe(5433)
      expect(cfg.database).toBe('custom_db')
      expect(cfg.user).toBe('custom_user')
    } finally {
      delete process.env.DEV_DB_POSTGRES_PORT
      delete process.env.DEV_DB_POSTGRES_DATABASE
      delete process.env.DEV_DB_POSTGRES_USER
    }
  })

  it('giữ nguyên giá trị mặc định an toàn khi không có biến môi trường', () => {
    const mssql = getEffectiveEngineConfig('mssql')
    expect(mssql.port).toBe(1434)
    expect(mssql.port).not.toBe(1433)

    const mariadb = getEffectiveEngineConfig('mariadb')
    expect(mariadb.port).toBe(3307)
  })
})
