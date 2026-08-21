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

const CONNECTION_ID = 'conn-data-test'
const READONLY_CONN_ID = 'conn-data-readonly'
const SCHEMA = 'corvus_conf'

const profile: ConnectionProfile = {
  id: CONNECTION_ID,
  name: 'PostgreSQL Data Test',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
}

const readOnlyProfile: ConnectionProfile = {
  id: READONLY_CONN_ID,
  name: 'PostgreSQL ReadOnly Data Test',
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
    return [profile, readOnlyProfile]
  },
  async get(id) {
    if (id === CONNECTION_ID) return profile
    if (id === READONLY_CONN_ID) return readOnlyProfile
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

  readOnlyProfile.host = envHandle.profile.host
  readOnlyProfile.port = envHandle.profile.port
  readOnlyProfile.database = envHandle.profile.database
  readOnlyProfile.user = envHandle.profile.user

  await vault.set(
    { kind: 'db-password', ownerId: 'local-owner', connectionId: CONNECTION_ID },
    envHandle.profile.password ?? 'corvus',
  )
  await vault.set(
    { kind: 'db-password', ownerId: 'local-owner', connectionId: READONLY_CONN_ID },
    envHandle.profile.password ?? 'corvus',
  )

  if (!driverRegistry.has('postgres')) registerDriver(postgresDriver)

  sessions = new SessionManager()
  router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault })
}, 180_000)

afterAll(async () => {
  await sessions?.closeAll?.()
  await envHandle?.teardown()
})

describe('Wave 1 · Data Editor RPC Handlers (data.*)', () => {
  it('data.browse: stream dữ liệu bảng có sort và filter', async () => {
    const iter = router.handleStream('data.browse', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      sort: [{ field: 'country', dir: 'ASC' }],
      limit: 10,
      offset: 0,
    })

    const chunks = []
    for await (const chunk of iter) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBeGreaterThan(0)
    const allRows = chunks.flatMap((c) => (c as { rows?: unknown[] }).rows ?? [])
    expect(allRows.length).toBeGreaterThanOrEqual(3)
  })

  it('data.browse: filter theo giá trị điều kiện', async () => {
    const iter = router.handleStream('data.browse', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      filter: [{ join: 'AND', field: 'country', op: '=', value: 'Việt Nam' }],
      limit: 10,
      offset: 0,
    })

    const chunks = []
    for await (const chunk of iter) {
      chunks.push(chunk)
    }

    const allRows = chunks.flatMap((c) => (c as { rows?: unknown[] }).rows ?? [])
    expect(allRows.length).toBe(1)
  })

  it('data.count: đếm chính xác số dòng trong bảng', async () => {
    const res = (await router.handleRequest('data.count', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      estimate: false,
    })) as { count: number; isEstimate: boolean }

    expect(res.count).toBeGreaterThanOrEqual(3)
    expect(res.isEstimate).toBe(false)
  })

  it('data.previewChanges + data.applyChanges: luồng CRUD dữ liệu an toàn qua preview-token', async () => {
    // 1. Preview INSERT new country
    const previewInsert = (await router.handleRequest('data.previewChanges', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      inserts: [{ country_id: 999, country: 'TestCountry' }],
    })) as { sql: string; previewToken: string }

    expect(previewInsert.sql).toContain('INSERT INTO')
    expect(previewInsert.previewToken).toMatch(/^prev-/)

    // 2. Apply INSERT
    const applyInsert = (await router.handleRequest('data.applyChanges', {
      previewToken: previewInsert.previewToken,
    })) as { affectedRows: number; success: boolean }

    expect(applyInsert.success).toBe(true)
    expect(applyInsert.affectedRows).toBe(1)

    // Verify row was inserted
    const countRes = (await router.handleRequest('data.count', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
    })) as { count: number }
    expect(countRes.count).toBe(4)

    // 3. Preview UPDATE
    const previewUpdate = (await router.handleRequest('data.previewChanges', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      updates: [
        {
          keys: { country_id: 999 },
          values: { country: 'UpdatedCountry' },
        },
      ],
    })) as { sql: string; previewToken: string }

    expect(previewUpdate.sql).toContain('UPDATE')

    // 4. Apply UPDATE
    const applyUpdate = (await router.handleRequest('data.applyChanges', {
      previewToken: previewUpdate.previewToken,
    })) as { affectedRows: number; success: boolean }
    expect(applyUpdate.success).toBe(true)

    // 5. Preview DELETE
    const previewDelete = (await router.handleRequest('data.previewChanges', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      deletes: [{ country_id: 999 }],
    })) as { sql: string; previewToken: string }

    expect(previewDelete.sql).toContain('DELETE FROM')

    // 6. Apply DELETE
    const applyDelete = (await router.handleRequest('data.applyChanges', {
      previewToken: previewDelete.previewToken,
    })) as { affectedRows: number; success: boolean }
    expect(applyDelete.success).toBe(true)
    expect(applyDelete.affectedRows).toBe(1)
  })

  it('data.applyChanges: từ chối preview token đã sử dụng (chống Replay)', async () => {
    const preview = (await router.handleRequest('data.previewChanges', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      inserts: [{ country_id: 888, country: 'SingleUse' }],
    })) as { previewToken: string }

    // First apply -> OK
    await router.handleRequest('data.applyChanges', { previewToken: preview.previewToken })

    // Second apply with same token -> ERROR
    await expect(
      router.handleRequest('data.applyChanges', { previewToken: preview.previewToken }),
    ).rejects.toMatchObject({ code: 'PREVIEW_TOKEN_INVALID' })

    // Cleanup
    const delPreview = (await router.handleRequest('data.previewChanges', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'country',
      deletes: [{ country_id: 888 }],
    })) as { previewToken: string }
    await router.handleRequest('data.applyChanges', { previewToken: delPreview.previewToken })
  })

  it('data.applyChanges: chặn ghi nếu connection ở chế độ readOnly', async () => {
    const preview = (await router.handleRequest('data.previewChanges', {
      connectionId: READONLY_CONN_ID,
      schema: SCHEMA,
      table: 'country',
      inserts: [{ country_id: 777, country: 'Forbidden' }],
    })) as { previewToken: string }

    await expect(
      router.handleRequest('data.applyChanges', { previewToken: preview.previewToken }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('data.fkLookup: tra cứu giá trị gợi ý cho Foreign Key', async () => {
    const fkRes = (await router.handleRequest('data.fkLookup', {
      connectionId: CONNECTION_ID,
      referencedTable: `${SCHEMA}.country`,
      referencedColumn: 'country',
      search: 'Việt',
      limit: 10,
    })) as Array<{ key: string; label: string }>

    expect(Array.isArray(fkRes)).toBe(true)
    expect(fkRes.some((item) => item.label.includes('Việt Nam'))).toBe(true)
  })
})
