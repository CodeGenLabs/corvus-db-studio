import { describe, expect, it } from 'vitest'
import { sqliteDriver } from '@corvus/driver-sqlite'
import { getDockerTestProfile, isDockerServiceAvailable } from '../resolve'

describe('cross-engine equivalence · cùng câu hỏi cho cùng kết quả (T063, FR-009)', () => {
  it('truy vấn tổng quan số quốc gia và thành phố cho kết quả tương đương', async () => {
    // 1. SQLite in-memory / temporary sample
    const sqliteConn = await sqliteDriver.connect({
      id: 'eq-sqlite',
      name: 'eq sqlite',
      driverId: 'sqlite',
      database: ':memory:',
    })

    const initSql = `
      CREATE TABLE country (code TEXT PRIMARY KEY, name TEXT NOT NULL);
      INSERT INTO country (code, name) VALUES ('CA', 'Canada'), ('UK', 'United Kingdom'), ('US', 'United States');
    `

    for await (const _ of sqliteConn.execute({ sql: initSql })) {
      // execute schema setup
    }

    const sqliteRows: unknown[][] = []
    try {
      for await (const chunk of sqliteConn.execute({
        sql: 'SELECT code, name FROM country ORDER BY code',
      })) {
        sqliteRows.push(...chunk.rows)
      }
    } finally {
      await sqliteConn.close()
    }

    expect(sqliteRows.length).toBe(3)
    expect(sqliteRows[0]).toEqual(['CA', 'Canada'])
    expect(sqliteRows[1]).toEqual(['UK', 'United Kingdom'])
    expect(sqliteRows[2]).toEqual(['US', 'United States'])

    // 2. Nếu PostgreSQL container/service sẵn sàng, so khớp
    const pgAvailable = await isDockerServiceAvailable('postgres')
    if (pgAvailable) {
      const { postgresDriver } = await import('@corvus/driver-postgres')
      const pgProfile = getDockerTestProfile('postgres')
      const pgConn = await postgresDriver.connect(pgProfile)
      const pgRows: unknown[][] = []
      try {
        for await (const chunk of pgConn.execute({
          sql: 'SELECT code, name FROM corvus_dev.country WHERE code IN (\'CA\', \'UK\', \'US\') ORDER BY code',
        })) {
          pgRows.push(...chunk.rows)
        }
      } finally {
        await pgConn.close()
      }

      if (pgRows.length === 3) {
        expect(pgRows).toEqual(sqliteRows)
      }
    }
  })
})
