import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { MARIADB_CONFORMANCE, MYSQL_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { mysqlDriver } from './index'

/**
 * Conformance thật cho MariaDB (T060, FR-022, A-08):
 * - Khi Docker dev-db đang chạy: kết nối trực tiếp vào MariaDB trên cổng 3307.
 * - Khi Docker dev-db chưa chạy: fallback sang testcontainers mariadb:11.4.
 */
let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-mariadb',
  name: 'conformance mariadb',
  driverId: 'mariadb',
  host: '127.0.0.1',
  port: 3307,
  database: 'corvus_dev',
  user: 'corvus',
  password: 'corvus_dev_pw',
}

beforeAll(async () => {
  envHandle = await setupTestEnvironment(
    'mariadb',
    mysqlDriver,
    MYSQL_SETUP_SQL,
    async () => {
      const container = await new GenericContainer('mariadb:11.4')
        .withEnvironment({
          MARIADB_DATABASE: 'corvus',
          MARIADB_USER: 'corvus',
          MARIADB_PASSWORD: 'corvus_password',
          MARIADB_ROOT_PASSWORD: 'corvus_root_password',
        })
        .withExposedPorts(3306)
        .start()

      return {
        profile: {
          id: 'conf-mariadb-tc',
          name: 'conformance mariadb testcontainers',
          driverId: 'mariadb',
          host: container.getHost(),
          port: container.getMappedPort(3306),
          database: 'corvus',
          user: 'corvus',
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

runConformanceSuite(mysqlDriver, { profile, dialect: MARIADB_CONFORMANCE })

describe('MariaDB Driver Specific Integration Tests', () => {
  it('nhận diện đúng phiên bản server MariaDB', async () => {
    const conn = await mysqlDriver.connect(profile)
    try {
      expect(conn.serverVersion.raw.toLowerCase()).toContain('mariadb')
    } finally {
      await conn.close()
    }
  })
})
