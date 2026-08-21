import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { mongodbDriver } from './index'

/**
 * Integration test thật cho driver-mongodb (T058, FR-022, khoả lấp A-06).
 */
let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-mongodb',
  name: 'integration mongodb',
  driverId: 'mongodb',
  host: '127.0.0.1',
  port: 27017,
  database: 'corvus_dev',
  user: process.env.DEV_DB_MONGODB_ROOT_USER ?? 'admin',
  password: process.env.DEV_DB_MONGODB_ROOT_PASSWORD ?? 'corvus_dev_pw',
}

beforeAll(async () => {
  try {
    envHandle = await setupTestEnvironment(
      'mongodb',
      mongodbDriver,
      undefined,
      async () => {
        const container = await new GenericContainer('mongo:7')
          .withEnvironment({
            MONGO_INITDB_ROOT_USERNAME: 'admin',
            MONGO_INITDB_ROOT_PASSWORD: 'corvus_dev_pw',
            MONGO_INITDB_DATABASE: 'corvus_dev',
          })
          .withExposedPorts(27017)
          .start()

        const mappedProfile: ResolvedProfile = {
          id: 'conf-mongodb-tc',
          name: 'integration mongodb testcontainers',
          driverId: 'mongodb',
          host: container.getHost(),
          port: container.getMappedPort(27017),
          database: 'corvus_dev',
          user: 'admin',
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
    console.warn('[mongodb.integration.test] Không thể khởi tạo môi trường MongoDB:', err)
  }
}, 300_000)

afterAll(async () => {
  await envHandle?.teardown()
})

describe('driver-mongodb · Real Database Integration Tests', () => {
  it('kết nối và ping thành công tới MongoDB', async () => {
    const conn = await mongodbDriver.connect(profile)
    try {
      const rtt = await conn.ping()
      expect(rtt).toBeGreaterThanOrEqual(0)
    } finally {
      await conn.close()
    }
  })

  it('introspect.listDatabases liệt kê các database thật', async () => {
    const conn = await mongodbDriver.connect(profile)
    try {
      const dbs = await conn.introspect.listDatabases()
      expect(dbs.length).toBeGreaterThan(0)
    } finally {
      await conn.close()
    }
  })
})
