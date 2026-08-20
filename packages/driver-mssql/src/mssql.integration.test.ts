import { afterAll, beforeAll } from 'vitest'
import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import { MSSQL_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import type { ResolvedProfile } from '@corvus/driver-core'
import { mssqlDriver } from './index'

let container: StartedTestContainer | undefined
let skipTests = false

const profile: ResolvedProfile = {
  id: 'conf-mssql',
  name: 'conformance mssql',
  driverId: 'mssql',
  host: '127.0.0.1',
  port: 1433,
  database: 'master',
  user: 'sa',
  password: 'CorvusPassword123!',
}

beforeAll(async () => {
  try {
    container = await new GenericContainer('mcr.microsoft.com/mssql/server:2022-latest')
      .withEnvironment({
        ACCEPT_EULA: 'Y',
        MSSQL_SA_PASSWORD: 'CorvusPassword123!',
      })
      .withExposedPorts(1433)
      .start()

    profile.host = container.getHost()
    profile.port = container.getMappedPort(1433)

    // Guard SR-007 (T063): Chờ SQL Server khởi động hoàn tất
    let connected = false
    for (let i = 0; i < 30; i++) {
      try {
        const testConn = await mssqlDriver.connect(profile)
        await testConn.ping()
        await testConn.close()
        connected = true
        break
      } catch {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }

    if (!connected) {
      skipTests = true
      return
    }

    const conn = await mssqlDriver.connect(profile)
    try {
      for (const sql of MSSQL_SETUP_SQL) {
        for await (const _ of conn.execute({ sql })) {
          /* DDL */
        }
      }
    } finally {
      await conn.close()
    }
  } catch {
    skipTests = true
  }
})

afterAll(async () => {
  if (container) {
    await container.stop().catch(() => {
      // ignore
    })
  }
})

if (!skipTests) {
  runConformanceSuite(mssqlDriver, { profile })
}
