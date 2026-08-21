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

const CONNECTION_ID = 'conn-mon-sec-test'
const READONLY_CONNECTION_ID = 'conn-mon-sec-ro-test'
const SCHEMA = 'corvus_conf'

const profile: ConnectionProfile = {
  id: CONNECTION_ID,
  name: 'PostgreSQL Monitor & Security Test',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
}

const roProfile: ConnectionProfile = {
  id: READONLY_CONNECTION_ID,
  name: 'PostgreSQL ReadOnly Monitor & Security Test',
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

  sessions = new SessionManager()
  router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault })
}, 180_000)

afterAll(async () => {
  await sessions?.closeAll?.()
  await envHandle?.teardown()
})

describe('Wave 2 · Server Monitor & User Management RPC Handlers (monitor.* & security.*)', () => {
  it('monitor.processes: stream danh sách tiến trình đang chạy', async () => {
    const stream = router.handleStream('monitor.processes', {
      connectionId: CONNECTION_ID,
      intervalMs: 500,
    })

    let firstChunk: { processes: unknown[]; seq: number; done: boolean } | undefined
    for await (const chunk of stream) {
      firstChunk = chunk as { processes: unknown[]; seq: number; done: boolean }
      break // Kéo 1 chunk và break
    }

    expect(firstChunk).toBeDefined()
    expect(Array.isArray(firstChunk?.processes)).toBe(true)
  })

  it('monitor.variables: đọc biến hệ thống pg_settings', async () => {
    const vars = (await router.handleRequest('monitor.variables', {
      connectionId: CONNECTION_ID,
    })) as Array<{ name: string; value: string }>

    expect(vars.length).toBeGreaterThan(0)
    expect(vars.some((v) => v.name.includes('port') || v.name.includes('max_connections'))).toBe(true)
  })

  it('monitor.status: đọc thông tin trạng thái máy chủ', async () => {
    const status = (await router.handleRequest('monitor.status', {
      connectionId: CONNECTION_ID,
    })) as Record<string, string>

    expect(status['dialect']).toBe('postgres')
    expect(status['version']).toContain('PostgreSQL')
  })

  it('monitor.killProcess: gọi lệnh huỷ tiến trình', async () => {
    const res = (await router.handleRequest('monitor.killProcess', {
      connectionId: CONNECTION_ID,
      processId: '999999', // dummy pid
    })) as { success: boolean }

    expect(res.success).toBe(true)
  })

  it('security.users: liệt kê danh sách người dùng PostgreSQL', async () => {
    const users = (await router.handleRequest('security.users', {
      connectionId: CONNECTION_ID,
    })) as Array<{ user: string; host?: string; roles: string[]; status?: string }>

    expect(users.length).toBeGreaterThan(0)
    expect(users.some((u) => u.user === 'corvus')).toBe(true)
  })

  it('security.roles: liệt kê danh sách roles', async () => {
    const roles = (await router.handleRequest('security.roles', {
      connectionId: CONNECTION_ID,
    })) as Array<{ role: string; members: string[] }>

    expect(Array.isArray(roles)).toBe(true)
  })

  it('security.privileges: tra cứu quyền của user', async () => {
    const privs = (await router.handleRequest('security.privileges', {
      connectionId: CONNECTION_ID,
      userOrRole: 'corvus',
    })) as Array<{ object: string; privilege: string; granted: boolean }>

    expect(Array.isArray(privs)).toBe(true)
  })

  it('security.previewGrant + security.applyGrant: cấp quyền an toàn qua preview-token', async () => {
    // 1. Preview
    const preview = (await router.handleRequest('security.previewGrant', {
      connectionId: CONNECTION_ID,
      userOrRole: 'corvus',
      grants: [
        { object: `${SCHEMA}.country`, privilege: 'SELECT', grant: true },
      ],
    })) as { sql: string; previewToken: string }

    expect(preview.sql).toContain('GRANT SELECT ON')
    expect(preview.previewToken).toBeTruthy()

    // 2. Apply
    const apply = (await router.handleRequest('security.applyGrant', {
      previewToken: preview.previewToken,
    })) as { success: boolean }

    expect(apply.success).toBe(true)
  })

  it('security.applyGrant: từ chối thao tác khi connection ở chế độ readOnly', async () => {
    const preview = (await router.handleRequest('security.previewGrant', {
      connectionId: READONLY_CONNECTION_ID,
      userOrRole: 'corvus',
      grants: [
        { object: `${SCHEMA}.country`, privilege: 'SELECT', grant: true },
      ],
    })) as { previewToken: string }

    await expect(
      router.handleRequest('security.applyGrant', {
        previewToken: preview.previewToken,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
