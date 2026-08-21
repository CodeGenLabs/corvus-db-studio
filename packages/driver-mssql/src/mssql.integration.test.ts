import { afterAll, beforeAll } from 'vitest'
import { GenericContainer } from 'testcontainers'
import { MSSQL_CONFORMANCE, MSSQL_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'
import type { ResolvedProfile } from '@corvus/driver-core'
import { mssqlDriver } from './index'

let envHandle: TestEnvironmentHandle | undefined

const profile: ResolvedProfile = {
  id: 'conf-mssql',
  name: 'conformance mssql',
  driverId: 'mssql',
  host: '127.0.0.1',
  port: 1434, // Cổng dev-db an toàn (không dùng 1433 của máy host)
  database: 'corvus_dev',
  user: 'sa',
  password: 'Corvus_dev_pw1',
}

beforeAll(async () => {
  try {
    envHandle = await setupTestEnvironment(
      'mssql',
      mssqlDriver,
      MSSQL_SETUP_SQL,
      async () => {
        const container = await new GenericContainer(
          'mcr.microsoft.com/mssql/server:2022-latest',
        )
          .withEnvironment({
            ACCEPT_EULA: 'Y',
            MSSQL_SA_PASSWORD: 'Corvus_dev_pw1',
          })
          .withExposedPorts(1433)
          .start()

        const mappedProfile: ResolvedProfile = {
          id: 'conf-mssql-tc',
          name: 'conformance mssql testcontainers',
          driverId: 'mssql',
          host: container.getHost(),
          port: container.getMappedPort(1433),
          database: 'master',
          user: 'sa',
          password: 'Corvus_dev_pw1',
        }

        // Chờ SQL Server khởi động hoàn tất
        for (let i = 0; i < 30; i++) {
          try {
            const testConn = await mssqlDriver.connect(mappedProfile)
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
    console.warn('[mssql.integration.test] Không thể khởi tạo môi trường MSSQL:', err)
  }
}, 300_000)

afterAll(async () => {
  await envHandle?.teardown()
})

runConformanceSuite(mssqlDriver, {
  profile,
  schema: 'corvus_dev',
  dialect: {
    ...MSSQL_CONFORMANCE,
    schema: 'corvus_dev',
    qualify: (n) => `corvus_dev.[${n}]`,
  },
})

