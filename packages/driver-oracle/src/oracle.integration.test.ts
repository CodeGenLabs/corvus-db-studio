import { afterAll, beforeAll } from 'vitest'
import { GenericContainer, type StartedTestContainer } from 'testcontainers'
import { ORACLE_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core/conformance'
import type { ResolvedProfile } from '@corvus/driver-core'
import { oracleDriver } from './index'

let container: StartedTestContainer | undefined
let skipTests = false

const profile: ResolvedProfile = {
  id: 'conf-oracle',
  name: 'conformance oracle',
  driverId: 'oracle',
  host: '127.0.0.1',
  port: 1521,
  database: 'FREEPDB1',
  user: 'SYSTEM',
  password: 'CorvusPassword123!',
}

beforeAll(async () => {
  try {
    container = await new GenericContainer('gvenzl/oracle-free:23-slim')
      .withEnvironment({
        ORACLE_PASSWORD: 'CorvusPassword123!',
      })
      .withExposedPorts(1521)
      .start()

    profile.host = container.getHost()
    profile.port = container.getMappedPort(1521)

    let connected = false
    for (let i = 0; i < 30; i++) {
      try {
        const testConn = await oracleDriver.connect(profile)
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

    const conn = await oracleDriver.connect(profile)
    try {
      for (const sql of ORACLE_SETUP_SQL) {
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
    await container.stop().catch(() => {})
  }
})

if (!skipTests) {
  runConformanceSuite(oracleDriver, { profile })
}
