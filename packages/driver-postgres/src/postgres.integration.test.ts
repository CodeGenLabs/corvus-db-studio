import { afterAll, beforeAll } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { POSTGRES_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { postgresDriver } from './index'

/**
 * Conformance thật cho driver-postgres:
 * - Khi Docker dev-db đang chạy: kết nối trực tiếp vào stack cố định (nhanh).
 * - Khi Docker dev-db chưa chạy: fallback sang testcontainers (R-4, R-5).
 */
let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-pg',
  name: 'conformance postgres',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
  password: 'corvus',
}

beforeAll(async () => {
  envHandle = await setupTestEnvironment(
    'postgres',
    postgresDriver,
    POSTGRES_SETUP_SQL,
    async () => {
      const container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('corvus')
        .withUsername('corvus')
        .withPassword('corvus')
        .start()

      return {
        profile: {
          id: 'conf-pg-tc',
          name: 'conformance postgres testcontainers',
          driverId: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          database: 'corvus',
          user: 'corvus',
          password: 'corvus',
        },
        stop: async () => {
          await container.stop()
        },
      }
    },
  )

  Object.assign(profile, envHandle.profile)
})

afterAll(async () => {
  await envHandle?.teardown()
})

runConformanceSuite(postgresDriver, { profile })
