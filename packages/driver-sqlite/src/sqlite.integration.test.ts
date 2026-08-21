import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ResolvedProfile } from '@corvus/driver-core'
import { buildSampleSqlite } from '../../../docker/dev-db/seed/sqlite/build-sample'
import { sqliteDriver } from './index'

/**
 * Integration test cho driver-sqlite trên database mẫu (T061, FR-002, FR-022).
 */
const sampleDbFile = path.resolve(__dirname, '../../../.corvus-data/sample.sqlite')

const profile: ResolvedProfile = {
  id: 'int-sqlite',
  name: 'integration sqlite sample',
  driverId: 'sqlite',
  database: sampleDbFile,
}

beforeAll(async () => {
  buildSampleSqlite(sampleDbFile)
})

describe('driver-sqlite · Sample Database Integration Tests', () => {
  it('tệp SQLite mẫu tồn tại và kết nối thành công', async () => {
    expect(fs.existsSync(sampleDbFile)).toBe(true)
    const conn = await sqliteDriver.connect(profile)
    try {
      const rtt = await conn.ping()
      expect(rtt).toBeGreaterThanOrEqual(0)
    } finally {
      await conn.close()
    }
  })

  it('introspect.listObjects thấy đủ các bảng country, city, customer, order_log', async () => {
    const conn = await sqliteDriver.connect(profile)
    try {
      const objects = await conn.introspect.listObjects({})
      const names = objects.map((o) => o.name)
      expect(names).toContain('country')
      expect(names).toContain('city')
      expect(names).toContain('customer')
      expect(names).toContain('order_log')
      expect(names).toContain('city_view')
    } finally {
      await conn.close()
    }
  })
})
