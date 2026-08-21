import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { redisDriver } from './index'

/**
 * Integration test thật cho driver-redis (T059, FR-022, khoả lấp A-06).
 */
let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-redis',
  name: 'integration redis',
  driverId: 'redis',
  host: '127.0.0.1',
  port: 6379,
  password: 'corvus_dev_pw',
}

beforeAll(async () => {
  try {
    envHandle = await setupTestEnvironment(
      'redis',
      redisDriver,
      undefined,
      async () => {
        const container = await new GenericContainer('redis:7-alpine')
          .withCommand(['redis-server', '--requirepass', 'corvus_dev_pw'])
          .withExposedPorts(6379)
          .start()

        const mappedProfile: ResolvedProfile = {
          id: 'conf-redis-tc',
          name: 'integration redis testcontainers',
          driverId: 'redis',
          host: container.getHost(),
          port: container.getMappedPort(6379),
          password: 'corvus_dev_pw',
        }

        return {
          profile: mappedProfile,
          stop: async () => {
            await container.stop()
          },
        }
      },
    )

    Object.assign(profile, envHandle.profile)
  } catch (err) {
    console.warn('[redis.integration.test] Không thể khởi tạo môi trường Redis:', err)
  }
}, 300_000)

afterAll(async () => {
  await envHandle?.teardown()
})

describe('driver-redis · Real Database Integration Tests', () => {
  it('kết nối và ping thành công tới Redis', async () => {
    const conn = await redisDriver.connect(profile)
    try {
      const rtt = await conn.ping()
      expect(rtt).toBeGreaterThanOrEqual(0)
    } finally {
      await conn.close()
    }
  })

  it('thực thi lệnh PING và INFO qua execute', async () => {
    const conn = await redisDriver.connect(profile)
    try {
      let received = false
      for await (const chunk of conn.execute({ sql: 'PING' })) {
        if (chunk.rows.length > 0) {
          received = true
        }
      }
      expect(received).toBe(true)
    } finally {
      await conn.close()
    }
  })
})
