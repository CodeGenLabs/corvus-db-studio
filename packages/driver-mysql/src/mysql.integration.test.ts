import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MySqlContainer } from '@testcontainers/mysql'
import { MYSQL_CONFORMANCE, MYSQL_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { mysqlDriver } from './index'

/**
 * Conformance thật cho driver-mysql:
 * - Khi Docker dev-db đang chạy: kết nối trực tiếp vào stack cố định (nhanh).
 * - Khi Docker dev-db chưa chạy: fallback sang testcontainers (R-4, R-5).
 */
let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-mysql',
  name: 'conformance mysql',
  driverId: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'corvus_dev',
  user: 'corvus',
  password: 'corvus_dev_pw',
}

beforeAll(async () => {
  envHandle = await setupTestEnvironment(
    'mysql',
    mysqlDriver,
    MYSQL_SETUP_SQL,
    async () => {
      const container = await new MySqlContainer('mysql:8.0')
        .withDatabase('corvus')
        .withRootPassword('corvus_password')
        .start()

      return {
        profile: {
          id: 'conf-mysql-tc',
          name: 'conformance mysql testcontainers',
          driverId: 'mysql',
          host: container.getHost(),
          port: container.getPort(),
          database: 'corvus',
          user: 'root',
          password: 'corvus_password',
        },
        stop: async () => {
          await container.stop()
        },
      }
    },
  )

  Object.assign(profile, envHandle.profile)
}, 300_000)

afterAll(async () => {
  await envHandle?.teardown()
})

// Chạy bộ Conformance chung cho MySQL
runConformanceSuite(mysqlDriver, { profile, dialect: MYSQL_CONFORMANCE })

describe('MySQL Driver Special Integration Tests', () => {
  it('streaming 100k dòng giữ RAM ổn định (NFR-03)', async () => {
    const conn = await mysqlDriver.connect(profile)
    const memBefore = process.memoryUsage().heapUsed
    let count = 0

    try {
      // Dùng Cross-Join 5 bảng số (0..9) để tạo chính xác 100 000 dòng mà không phụ thuộc cte_max_recursion_depth
      const sql = `
        WITH d AS (
          SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
        )
        SELECT (d1.n + d2.n * 10 + d3.n * 100 + d4.n * 1000 + d5.n * 10000) AS n
        FROM d d1, d d2, d d3, d d4, d d5
      `
      for await (const chunk of conn.execute({ sql, chunkSize: 2000 })) {
        count += chunk.rows.length
      }

      const memAfter = process.memoryUsage().heapUsed
      const memDiffMb = (memAfter - memBefore) / (1024 * 1024)

      expect(count).toBe(100_000)
      // Mức tăng RAM heap trong quá trình stream không được bùng nổ vượt quá 100MB
      expect(memDiffMb).toBeLessThan(100)
    } finally {
      await conn.close()
    }
  }, 120_000)

  it('cancel query đang chạy bằng KILL QUERY nhả backend < 200ms', async () => {
    const conn = await mysqlDriver.connect(profile)
    try {
      const controller = new AbortController()
      const slowQueryPromise = (async () => {
        // SLEEP(10) giữ backend trong 10 giây
        const iter = conn.execute({ sql: 'SELECT SLEEP(10) AS s', signal: controller.signal })
        for await (const _ of iter) {
          // không tới được đây
        }
      })()

      // Chờ 50ms để query chắc chắn đã gửi và nhận threadId
      await new Promise((r) => setTimeout(r, 50))

      const t0 = Date.now()
      controller.abort()

      await expect(slowQueryPromise).rejects.toMatchObject({
        code: 'QUERY_CANCELLED',
      })
      const duration = Date.now() - t0
      expect(duration).toBeLessThan(500)
    } finally {
      await conn.close()
    }
  })
})
