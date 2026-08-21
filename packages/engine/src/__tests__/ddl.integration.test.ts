import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { ConnectionProfile } from '@corvus/contract'
import { registerDriver, driverRegistry } from '@corvus/driver-core'
import { POSTGRES_SETUP_SQL } from '@corvus/driver-core/conformance'
import { postgresDriver } from '@corvus/driver-postgres'
import type { SecretRef, SecretVault } from '@corvus/storage'
import { EngineRouter } from '../router'
import { SessionManager } from '../session'
import { registerHandlers, type ConnectionStore } from '../handlers'

let router: EngineRouter
let sessions: SessionManager

const CONNECTION_ID = 'conn-ddl-test'
const READONLY_CONNECTION_ID = 'conn-ddl-ro-test'
const SCHEMA = 'corvus_conf'

const profile: ConnectionProfile = {
  id: CONNECTION_ID,
  name: 'PostgreSQL DDL Test',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
}

const roProfile: ConnectionProfile = {
  id: READONLY_CONNECTION_ID,
  name: 'PostgreSQL ReadOnly DDL Test',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
  readOnly: true,
}

class MemoryVault implements SecretVault {
  private readonly store = new Map<string, string>()
  private key(ref: SecretRef) {
    return `${ref.kind}:${ref.ownerId}:${ref.connectionId}`
  }
  async set(ref: SecretRef, value: string) {
    this.store.set(this.key(ref), value)
  }
  async get(ref: SecretRef) {
    return this.store.get(this.key(ref))
  }
  async delete(ref: SecretRef) {
    this.store.delete(this.key(ref))
  }
}

const connections: ConnectionStore = {
  async list() {
    return [profile, roProfile]
  },
  async get(id) {
    if (id === CONNECTION_ID) return profile
    if (id === READONLY_CONNECTION_ID) return roProfile
    return undefined
  },
}

const vault = new MemoryVault()

import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'

let envHandle: TestEnvironmentHandle | undefined

beforeAll(async () => {
  envHandle = await setupTestEnvironment(
    'postgres',
    postgresDriver,
    POSTGRES_SETUP_SQL,
    async () => {
      const c = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('corvus')
        .withUsername('corvus')
        .withPassword('corvus')
        .start()
      return {
        profile: {
          id: CONNECTION_ID,
          name: 'PostgreSQL test',
          driverId: 'postgres',
          host: c.getHost(),
          port: c.getPort(),
          database: 'corvus',
          user: 'corvus',
          password: 'corvus',
        },
        stop: async () => {
          await c.stop()
        },
      }
    },
  )

  profile.host = envHandle.profile.host
  profile.port = envHandle.profile.port
  profile.database = envHandle.profile.database
  profile.user = envHandle.profile.user

  roProfile.host = envHandle.profile.host
  roProfile.port = envHandle.profile.port
  roProfile.database = envHandle.profile.database
  roProfile.user = envHandle.profile.user

  await vault.set(
    { kind: 'db-password', ownerId: 'local-owner', connectionId: CONNECTION_ID },
    envHandle.profile.password ?? 'corvus',
  )
  await vault.set(
    { kind: 'db-password', ownerId: 'local-owner', connectionId: READONLY_CONNECTION_ID },
    envHandle.profile.password ?? 'corvus',
  )

  if (!driverRegistry.has('postgres')) registerDriver(postgresDriver)

  // Dọn dẹp bảng thử nghiệm từ lần chạy trước nếu có
  const cleanupConn = await postgresDriver.connect({
    ...profile,
    password: envHandle.profile.password ?? 'corvus',
  })
  try {
    for (const sql of [
      'DROP VIEW IF EXISTS corvus_conf.test_products_view CASCADE',
      'DROP TABLE IF EXISTS corvus_conf.test_products CASCADE',
      'DROP VIEW IF EXISTS test_products_view CASCADE',
      'DROP TABLE IF EXISTS test_products CASCADE',
    ]) {
      for await (const _ of cleanupConn.execute({ sql })) {
        /* cleanup */
      }
    }
  } finally {
    await cleanupConn.close()
  }

  sessions = new SessionManager()
  router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault })
}, 180_000)

afterAll(async () => {
  await sessions?.closeAll?.()
  await envHandle?.teardown()
})

describe('Wave 2 · DDL Designer & Workspace Settings RPC Handlers (ddl.* & workspace.*)', () => {
  it('ddl.previewTable + ddl.applyTable: tạo bảng mới hoàn chỉnh qua preview-token', async () => {
    // 1. Preview
    const preview = (await router.handleRequest('ddl.previewTable', {
      connectionId: CONNECTION_ID,
      tableDesign: {
        name: 'test_products',
        schema: SCHEMA,
        columns: [
          { name: 'id', type: 'SERIAL', primaryKey: true },
          { name: 'sku', type: 'VARCHAR(50)', nullable: false, unique: true },
          { name: 'price', type: 'NUMERIC(10,2)', defaultValue: '0.00' },
        ],
      },
    })) as { sql: string; previewToken: string; warnings: string[] }

    expect(preview.sql).toContain('CREATE TABLE')
    expect(preview.sql).toContain('PRIMARY KEY')
    expect(preview.previewToken).toBeTruthy()

    // 2. Apply
    const apply = (await router.handleRequest('ddl.applyTable', {
      previewToken: preview.previewToken,
    })) as { success: boolean }

    expect(apply.success).toBe(true)
  })

  it('ddl.applyTable: từ chối ghi khi connection ở chế độ readOnly', async () => {
    const preview = (await router.handleRequest('ddl.previewTable', {
      connectionId: READONLY_CONNECTION_ID,
      tableDesign: {
        name: 'test_ro_table',
        schema: SCHEMA,
        columns: [{ name: 'id', type: 'INTEGER' }],
      },
    })) as { previewToken: string }

    await expect(
      router.handleRequest('ddl.applyTable', {
        previewToken: preview.previewToken,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('ddl.previewView + ddl.applyView: tạo View truy vấn', async () => {
    const preview = (await router.handleRequest('ddl.previewView', {
      connectionId: CONNECTION_ID,
      viewDesign: {
        name: 'v_country_names',
        schema: SCHEMA,
        query: `SELECT country_id, country FROM ${SCHEMA}.country`,
      },
    })) as { sql: string; previewToken: string }

    expect(preview.sql).toContain('CREATE OR REPLACE VIEW')

    const apply = (await router.handleRequest('ddl.applyView', {
      previewToken: preview.previewToken,
    })) as { success: boolean }

    expect(apply.success).toBe(true)
  })

  it('ddl.dropObject: sinh SQL DROP và xoá đối tượng an toàn', async () => {
    const preview = (await router.handleRequest('ddl.dropObject', {
      connectionId: CONNECTION_ID,
      kind: 'VIEW',
      name: `${SCHEMA}.v_country_names`,
      cascade: true,
    })) as { sql: string; previewToken: string; warnings: string[] }

    expect(preview.sql).toBe(`DROP VIEW "${SCHEMA}"."v_country_names" CASCADE;`)
    expect(preview.warnings.length).toBeGreaterThan(0)

    const apply = (await router.handleRequest('ddl.applyTable', {
      previewToken: preview.previewToken,
    })) as { success: boolean }

    expect(apply.success).toBe(true)
  })

  it('ddl.maintain: thực thi bảo trì bảng (ANALYZE / VACUUM)', async () => {
    const res = (await router.handleRequest('ddl.maintain', {
      connectionId: CONNECTION_ID,
      table: `${SCHEMA}.country`,
      action: 'analyze',
    })) as { success: boolean; message: string }

    expect(res.success).toBe(true)
    expect(res.message).toContain('analyze')
  })

  it('workspace.settings.get & set: đọc và ghi cấu hình người dùng', async () => {
    // 1. Get default settings
    const settings = (await router.handleRequest('workspace.settings.get', {})) as Record<string, unknown>
    expect(settings).toBeDefined()
    expect(settings['theme']).toBe('dark')

    // 2. Set new setting
    const setRes = (await router.handleRequest('workspace.settings.set', {
      settings: {
        theme: 'light',
        editor: { fontSize: 16 },
      },
    })) as { success: boolean }
    expect(setRes.success).toBe(true)

    // 3. Verify updated setting
    const updated = (await router.handleRequest('workspace.settings.get', {})) as Record<string, unknown>
    expect(updated['theme']).toBe('light')
  })
})
