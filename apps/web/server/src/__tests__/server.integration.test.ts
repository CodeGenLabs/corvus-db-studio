import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { Server } from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EnvelopeVault, openWorkspace } from '@corvus/storage'

/**
 * R-08b: chứng minh bản WEB chạy thật — HTTP RPC → engine → PostgreSQL.
 *
 * Khác với test của engine (gọi router trực tiếp), test này đi qua đúng lớp mạng mà
 * trình duyệt dùng, nên bắt được cả lỗi nối dây ở `apps/web/server` (ví dụ: result
 * validation từ chối `color: null` — lỗi thật đã gặp khi nối UI).
 */
let container: StartedPostgreSqlContainer
let server: Server | undefined
let shutdown: ((s?: Server) => Promise<void>) | undefined
let baseUrl: string
let dataDir: string

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

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('corvus')
    .withUsername('corvus')
    .withPassword('corvus')
    .start()

  // Chuẩn bị workspace riêng cho test — không đụng .corvus-data của máy dev.
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'corvus-web-it-'))
  const ws = openWorkspace({ path: path.join(dataDir, 'workspace.db') })
  const owner = ws.storage.ensureLocalOwner()
  ws.storage.upsertConnection(owner, {
    id: 'pg',
    name: 'PG test',
    driverId: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    database: 'corvus',
    user: 'corvus',
  })
  await new EnvelopeVault(MASTER_KEY, ws.db).set(
    { kind: 'db-password', ownerId: owner, connectionId: 'pg' },
    'corvus',
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

  // Tạo schema mẫu qua chính driver.
  const { postgresDriver } = await import('@corvus/driver-postgres')
  const { splitStatements } = await import('@corvus/sql')
  const { POSTGRES_SETUP_SQL } = await import('@corvus/driver-core/conformance')
  const conn = await postgresDriver.connect({
    id: 'seed',
    name: 'seed',
    driverId: 'postgres',
    host: container.getHost(),
    port: container.getPort(),
    database: 'corvus',
    user: 'corvus',
    password: 'corvus',
  })
  try {
    for (const sql of splitStatements(POSTGRES_SETUP_SQL, 'postgres')) {
      for await (const _ of conn.execute({ sql })) {
        /* DDL */
      }
    }
  } finally {
    await conn.close()
  }
}, 240_000)

afterAll(async () => {
  // Phải đóng cả engine: nếu không, workspace.db còn bị khoá và rmSync báo EBUSY.
  await shutdown?.(server)
  await container?.stop()
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
    expect(dbs).toContain('corvus')

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
