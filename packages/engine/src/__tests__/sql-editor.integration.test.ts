import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { ConnectionProfile } from '@corvus/contract'
import { registerDriver, driverRegistry } from '@corvus/driver-core'
import { POSTGRES_SETUP_SQL } from '@corvus/driver-core/conformance'
import { postgresDriver } from '@corvus/driver-postgres'
import { splitStatements } from '@corvus/sql'
import type { SecretRef, SecretVault } from '@corvus/storage'
import { EngineRouter } from '../router'
import { SessionManager } from '../session'
import { registerHandlers, type ConnectionStore } from '../handlers'

let container: StartedPostgreSqlContainer
let router: EngineRouter
let sessions: SessionManager

const CONNECTION_ID = 'conn-sql-editor-test'
const SCHEMA = 'corvus_conf'

const profile: ConnectionProfile = {
  id: CONNECTION_ID,
  name: 'PostgreSQL Editor Test',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
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
    return [profile]
  },
  async get(id) {
    return id === CONNECTION_ID ? profile : undefined
  },
}

const vault = new MemoryVault()

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('corvus')
    .withUsername('corvus')
    .withPassword('corvus')
    .start()

  profile.host = container.getHost()
  profile.port = container.getPort()

  await vault.set({ kind: 'db-password', ownerId: 'local-owner', connectionId: CONNECTION_ID }, 'corvus')

  if (!driverRegistry.has('postgres')) registerDriver(postgresDriver)

  const conn = await postgresDriver.connect({ ...profile, password: 'corvus' })
  try {
    for (const sql of splitStatements(POSTGRES_SETUP_SQL, 'postgres')) {
      for await (const _ of conn.execute({ sql })) {
        /* setup */
      }
    }
  } finally {
    await conn.close()
  }

  sessions = new SessionManager()
  router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault })
}, 180_000)

afterAll(async () => {
  await sessions?.closeAll?.()
  await container?.stop()
})

describe('Wave 1 · SQL Editor & Transaction RPC Handlers (query.* & tx.*)', () => {
  it('query.explain: trích xuất kế hoạch thực thi EXPLAIN JSON từ PostgreSQL', async () => {
    const res = (await router.handleRequest('query.explain', {
      connectionId: CONNECTION_ID,
      sql: `SELECT * FROM ${SCHEMA}.country WHERE country_id = 1`,
      analyze: false,
    })) as { format: string; plan: unknown; raw: string }

    expect(res.raw).toBeTruthy()
    expect(['json', 'text', 'tree']).toContain(res.format)
    expect(res.plan).toBeDefined()
  })

  it('query.format: định dạng câu truy vấn SQL chuẩn đẹp', async () => {
    const messySql = 'select id, name from users where id > 10 order by name asc limit 5'
    const res = (await router.handleRequest('query.format', {
      sql: messySql,
    })) as { sql: string }

    expect(res.sql).toContain('SELECT')
    expect(res.sql).toContain('\nFROM')
    expect(res.sql).toContain('\nWHERE')
    expect(res.sql).toContain('\nORDER BY')
  })

  it('query.parse: bóc tách đa câu lệnh SQL kèm số dòng', async () => {
    const multiSql = `SELECT * FROM users;\n\nUPDATE accounts SET balance = 100 WHERE id = 1;\nDELETE FROM logs;`
    const res = (await router.handleRequest('query.parse', {
      sql: multiSql,
    })) as {
      statements: Array<{ sql: string; type: string; startLine: number; endLine: number }>
    }

    expect(res.statements).toHaveLength(3)
    const [s0, s1, s2] = res.statements
    expect(s0?.sql).toBe('SELECT * FROM users')
    expect(s0?.type).toBe('READ')
    expect(s1?.type).toBe('WRITE')
    expect(s2?.type).toBe('WRITE')
  })

  it('query.cancel: gửi yêu cầu huỷ query', async () => {
    const res = (await router.handleRequest('query.cancel', {
      queryId: 'q-12345',
    })) as { success: boolean }
    expect(res.success).toBe(true)
  })

  it('query.history: lưu vết sau khi query.execute chạy và xoá lịch sử', async () => {
    // 1. Chạy một câu lệnh qua query.execute
    const stream = router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: `SELECT * FROM ${SCHEMA}.country LIMIT 2`,
    })
    for await (const _ of stream) {
      /* tiêu thụ stream */
    }

    // 2. Tra cứu lịch sử
    const history = (await router.handleRequest('query.history.list', {
      limit: 10,
    })) as Array<{ id: string; sql: string; status: string; connectionName: string }>

    expect(history.length).toBeGreaterThan(0)
    const first = history[0]
    expect(first?.sql).toContain('SELECT * FROM')
    expect(first?.status).toBe('success')

    // 3. Xoá lịch sử
    const clearRes = (await router.handleRequest('query.history.clear', {})) as { success: boolean }
    expect(clearRes.success).toBe(true)

    const emptyHistory = (await router.handleRequest('query.history.list', {})) as unknown[]
    expect(emptyHistory).toHaveLength(0)
  })

  it('tx.begin + tx.status + tx.rollback / tx.commit: vòng đời quản lý transaction', async () => {
    // 1. Begin transaction
    const beginRes = (await router.handleRequest('tx.begin', {
      connectionId: CONNECTION_ID,
      isolationLevel: 'read_committed',
    })) as { transactionId: string }

    expect(beginRes.transactionId).toMatch(/^tx-/)

    // 2. Check status
    const status1 = (await router.handleRequest('tx.status', {
      transactionId: beginRes.transactionId,
    })) as { active: boolean; startedAt: string; queryCount: number }

    expect(status1.active).toBe(true)
    expect(status1.startedAt).toBeTruthy()

    // 3. Rollback
    const rollbackRes = (await router.handleRequest('tx.rollback', {
      transactionId: beginRes.transactionId,
    })) as { success: boolean }

    expect(rollbackRes.success).toBe(true)

    // 4. Status after rollback -> inactive
    const status2 = (await router.handleRequest('tx.status', {
      transactionId: beginRes.transactionId,
    })) as { active: boolean }
    expect(status2.active).toBe(false)

    // 5. Begin & Commit
    const beginRes2 = (await router.handleRequest('tx.begin', {
      connectionId: CONNECTION_ID,
    })) as { transactionId: string }

    const commitRes = (await router.handleRequest('tx.commit', {
      transactionId: beginRes2.transactionId,
    })) as { success: boolean }
    expect(commitRes.success).toBe(true)
  })
})
