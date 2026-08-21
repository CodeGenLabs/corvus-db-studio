import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import type { Server } from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EnvelopeVault, openWorkspace } from '@corvus/storage'
import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'

let server: Server | undefined
let shutdown: ((s?: Server) => Promise<void>) | undefined
let baseUrl: string
let dataDir: string
let envHandle: TestEnvironmentHandle | undefined

const MASTER_KEY = '0'.repeat(64)

async function rpc<T = unknown>(method: string, params: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}/rpc/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${method} → ${res.status}: ${JSON.stringify(body)}`)
  return body as T
}

import { setupTestEnvironment, type TestEnvironmentHandle } from '@corvus/driver-core/testenv'

let envHandle: TestEnvironmentHandle | undefined

beforeAll(async () => {
  const { postgresDriver } = await import('@corvus/driver-postgres')
  const { POSTGRES_SETUP_SQL } = await import('@corvus/driver-core/conformance')

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
          id: 'pg-tc',
          name: 'PG test',
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

  // Chuẩn bị workspace riêng cho test — không đụng .corvus-data của máy dev.
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'corvus-web-it-'))
  const ws = openWorkspace({ path: path.join(dataDir, 'workspace.db') })
  const owner = ws.storage.ensureLocalOwner()
  ws.storage.upsertConnection(owner, {
    id: 'pg',
    name: 'PG test',
    driverId: 'postgres',
    host: envHandle.profile.host,
    port: envHandle.profile.port,
    database: envHandle.profile.database ?? 'corvus',
    user: envHandle.profile.user ?? 'corvus',
  })
  await new EnvelopeVault(MASTER_KEY, ws.db).set(
    { kind: 'db-password', ownerId: owner, connectionId: 'pg' },
    envHandle.profile.password ?? 'corvus',
  )
  ws.close()

  process.env.CORVUS_DATA_DIR = dataDir
  process.env.CORVUS_MASTER_KEY = MASTER_KEY

  // import động: buildEngine() đọc env lúc load module, nên phải set env trước.
  const mod = await import('../index')
  const port = 8100 + Math.floor(Math.random() * 400)
  baseUrl = `http://127.0.0.1:${port}`
  server = await mod.createWebServer(port)
  shutdown = mod.shutdown
}, 180_000)

afterAll(async () => {
  // Phải đóng cả engine: nếu không, workspace.db còn bị khoá và rmSync báo EBUSY.
  await shutdown?.(server)
  await envHandle?.teardown()
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true })
})

describe('R-08b · web server HTTP RPC trên PostgreSQL thật', () => {
  it('connection.list trả profile đã lưu trong workspace.db', async () => {
    const list = await rpc<Array<{ id: string; name: string; driverId: string }>>('connection.list', {})
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 'pg', driverId: 'postgres' })
  })

  it('connection.list KHÔNG trả về mật khẩu', async () => {
    const list = await rpc('connection.list', {})
    expect(JSON.stringify(list)).not.toContain('corvus_password')
    expect(JSON.stringify(list)).not.toMatch(/"password"/)
  })

  it('connection.test qua HTTP trả version PostgreSQL thật', async () => {
    const res = await rpc<{ ok: boolean; version?: string }>('connection.test', { id: 'pg' })
    expect(res.ok).toBe(true)
    expect(res.version).toContain('PostgreSQL')
  })

  it('introspect.databases → introspect.schemas → introspect.objects (đúng đường cây điều hướng)', async () => {
    const dbs = await rpc<string[]>('introspect.databases', { connectionId: 'pg' })
    expect(dbs).toContain(envHandle?.profile.database ?? 'corvus')

    const schemas = await rpc<string[]>('introspect.schemas', { connectionId: 'pg' })
    expect(schemas).toContain('corvus_conf')

    const tables = await rpc<Array<{ name: string; kind: string }>>('introspect.objects', {
      connectionId: 'pg',
      schema: 'corvus_conf',
      kind: 'table',
    })
    const names = tables.map((t) => t.name)
    expect(names).toContain('country')
    expect(names).toContain('city')
    // Không còn dữ liệu giả của driver cũ.
    expect(names).not.toContain('users')
  })

  it('method sai trả lỗi có mã code, không phải HTML 500 mơ hồ', async () => {
    const res = await fetch(`${baseUrl}/rpc/khong.co.method`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { code?: string; message?: string }
    expect(body.code).toBe('INVALID_INPUT')
    expect(body.message).toContain('Unknown method')
  })

  it('introspect.tableMeta với bảng không tồn tại trả lỗi có code', async () => {
    const res = await fetch(`${baseUrl}/rpc/introspect.tableMeta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: 'pg',
        schema: 'corvus_conf',
        table: 'non_existent_table_xyz',
      }),
    })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { code?: string; message?: string }
    expect(body.code).toBe('TABLE_NOT_FOUND')
    expect(typeof body.message).toBe('string')
  })

  it('CORS không dùng wildcard', async () => {
    const res = await fetch(`${baseUrl}/rpc/connection.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://ke-tan-cong.example' },
      body: '{}',
    })
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*')
  })
})
