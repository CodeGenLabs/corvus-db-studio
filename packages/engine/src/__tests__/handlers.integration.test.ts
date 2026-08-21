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

/**
 * R-08: chứng minh 5 handler RPC đầu tiên chạy THẬT qua router, trên PostgreSQL thật.
 *
 * Đây là bài kiểm quan trọng nhất của wave này: nó đi hết đường
 * `router → handler → SessionManager → driver → PostgreSQL` và ngược lại,
 * gồm cả validate zod của params và của result.
 */
let router: EngineRouter
let sessions: SessionManager

const CONNECTION_ID = 'conn-test-1'
const SCHEMA = 'corvus_conf'

const profile: ConnectionProfile = {
  id: CONNECTION_ID,
  name: 'PostgreSQL test',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
}

/** Vault in-memory: đủ cho test, và chứng minh handler lấy secret từ vault chứ không từ params. */
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
    return [profile]
  },
  async get(id) {
    return id === CONNECTION_ID ? profile : undefined
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

  await vault.set(
    { kind: 'db-password', ownerId: 'local-owner', connectionId: CONNECTION_ID },
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

describe('R-08 · handler RPC thật qua router', () => {
  it('connection.test với profile đã lưu trả về version thật', async () => {
    const res = (await router.handleRequest('connection.test', { id: CONNECTION_ID })) as {
      ok: boolean
      version?: string
      latencyMs?: number
    }
    expect(res.ok).toBe(true)
    expect(res.version).toContain('PostgreSQL')
    expect(res.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('connection.test với mật khẩu sai trả ok:false, KHÔNG ném và KHÔNG rò mật khẩu', async () => {
    const res = (await router.handleRequest('connection.test', {
      driverId: 'postgres',
      host: profile.host,
      port: profile.port,
      database: 'corvus',
      user: 'corvus',
      password: 'SENTINEL_WRONG_PASSWORD_XYZ',
    })) as { ok: boolean; error?: string }

    expect(res.ok).toBe(false)
    expect(res.error).toBeTruthy()
    // Thông điệp lỗi tuyệt đối không được chứa mật khẩu vừa gửi.
    expect(JSON.stringify(res)).not.toContain('SENTINEL_WRONG_PASSWORD_XYZ')
  })

  it('connection.open trả về capabilities đã thu hẹp theo server thật', async () => {
    const res = (await router.handleRequest('connection.open', { id: CONNECTION_ID })) as {
      sessionId: string
      capabilities: Record<string, unknown>
    }
    expect(res.sessionId).toBeTruthy()
    const objects = res.capabilities.objects as Record<string, boolean>
    expect(objects.table).toBe(true)
    // PostgreSQL 16 ⇒ procedure phải bật (chỉ có từ 11).
    expect(objects.procedure).toBe(true)
  })

  it('introspect.databases trả danh sách database thật', async () => {
    const dbs = (await router.handleRequest('introspect.databases', {
      connectionId: CONNECTION_ID,
    })) as string[]
    expect(dbs).toContain(profile.database ?? 'corvus')
  })

  it('introspect.schemas thấy schema fixture', async () => {
    const schemas = (await router.handleRequest('introspect.schemas', {
      connectionId: CONNECTION_ID,
    })) as string[]
    expect(schemas).toContain(SCHEMA)
  })

  it('introspect.objects trả bảng THẬT — đây là mốc chứng minh của R-08', async () => {
    const objects = (await router.handleRequest('introspect.objects', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
    })) as Array<{ name: string; kind: string; rows?: string }>

    const names = objects.map((o) => o.name)
    expect(names).toContain('country')
    expect(names).toContain('city')
    expect(names).toContain('order details')

    // KHÔNG được là dữ liệu giả cũ của driver (audit 2026-08-18).
    expect(names).not.toContain('users')
    expect(names).not.toContain('orders')
  })

  it('introspect.tableMeta trả cột, PK và FK thật', async () => {
    const meta = (await router.handleRequest('introspect.tableMeta', {
      connectionId: CONNECTION_ID,
      schema: SCHEMA,
      table: 'city',
    })) as { columns: Array<{ name: string; isPrimaryKey: boolean }>; foreignKeys: unknown[] }

    expect(meta.columns.map((c) => c.name)).toEqual(['city_id', 'country_id', 'city', 'note'])
    expect(meta.columns.find((c) => c.name === 'city_id')?.isPrimaryKey).toBe(true)
    expect(meta.foreignKeys).toHaveLength(1)
  })

  it('router từ chối method không có trong contract', async () => {
    await expect(router.handleRequest('khong.co.method.nay', {})).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
  })

  it('router validate params bằng zod trước khi gọi handler', async () => {
    // Thiếu connectionId (bắt buộc) → phải bị chặn ở tầng validate, không tới handler.
    await expect(router.handleRequest('introspect.objects', { schema: SCHEMA })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    })
  })

  it('method chưa có handler ném UNSUPPORTED_FEATURE, không phải lỗi mơ hồ', async () => {
    const emptyRouter = new EngineRouter()
    await expect(
      emptyRouter.handleRequest('connection.get', { id: 'conn-1' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' })
  })

  it('session được dùng lại: gọi 2 lần không tạo kết nối mới', async () => {
    await router.handleRequest('introspect.databases', { connectionId: CONNECTION_ID })
    const s1 = sessions.getSession(CONNECTION_ID)?.sessionId
    await router.handleRequest('introspect.databases', { connectionId: CONNECTION_ID })
    const s2 = sessions.getSession(CONNECTION_ID)?.sessionId
    expect(s1).toBe(s2)
  })

  it('connectionId không tồn tại ném NOT_FOUND', async () => {
    await expect(
      router.handleRequest('introspect.databases', { connectionId: 'khong-ton-tai' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
