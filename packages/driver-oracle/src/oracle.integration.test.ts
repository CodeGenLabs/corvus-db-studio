import { afterAll, beforeAll } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { ORACLE_CONFORMANCE, ORACLE_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { oracleDriver } from './index'

let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-oracle',
  name: 'conformance oracle',
  driverId: 'oracle',
  host: '127.0.0.1',
  port: 1521,
  database: 'FREEPDB1',
  user: 'CORVUS_DEV',
  password: 'corvus_dev_pw',
}

beforeAll(async () => {
  try {
    envHandle = await setupTestEnvironment(
      'oracle',
      oracleDriver,
      ORACLE_SETUP_SQL,
      async () => {
        const container = await new GenericContainer('gvenzl/oracle-free:23-slim')
          .withEnvironment({
            ORACLE_PASSWORD: 'CorvusPassword123!',
          })
          .withExposedPorts(1521)
          .start()

        const mappedProfile: ResolvedProfile = {
          id: 'conf-oracle-tc',
          name: 'conformance oracle testcontainers',
          driverId: 'oracle',
          host: container.getHost(),
          port: container.getMappedPort(1521),
          database: 'FREEPDB1',
          user: 'SYSTEM',
          password: 'CorvusPassword123!',
        }

        // Chờ Oracle khởi động hoàn tất
        for (let i = 0; i < 30; i++) {
          try {
            const testConn = await oracleDriver.connect(mappedProfile)
            await testConn.ping()
            await testConn.close()
            break
          } catch {
            await new Promise((r) => setTimeout(r, 1000))
          }
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
    console.warn('[oracle.integration.test] Không thể khởi tạo môi trường Oracle:', err)
  }
}, 300_000)

afterAll(async () => {
  await envHandle?.teardown()
})

runConformanceSuite(oracleDriver, {
  profile,
  schema: 'CORVUS_DEV',
  dialect: {
    ...ORACLE_CONFORMANCE,
    schema: 'CORVUS_DEV',
    qualify: (n) => `"CORVUS_DEV"."${n.toUpperCase()}"`,
  },
})

