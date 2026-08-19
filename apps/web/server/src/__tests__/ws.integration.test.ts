import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { Server } from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import WebSocket from 'ws'
import { EnvelopeVault, openWorkspace } from '@corvus/storage'
import type { Frame } from '@corvus/transport-http/frames'

/**
 * T-B05: chứng minh đường ống streaming chạy THẬT —
 * WebSocket trình duyệt → /ws → HttpRpcServer → EngineRouter → driver → PostgreSQL.
 *
 * Test unit ở `packages/transport-http` đã kiểm framing bằng socket giả. Test này kiểm
 * phần mà socket giả không kiểm được: upgrade HTTP, kiểm origin, và hành vi khi socket
 * thật bị giết giữa stream.
 */
let container: StartedPostgreSqlContainer
let server: Server | undefined
let shutdown: ((s?: Server) => Promise<void>) | undefined
let baseUrl: string
let wsUrl: string
let dataDir: string

const MASTER_KEY = '0'.repeat(64)

/** Một phiên WebSocket có tiện ích chờ khung theo điều kiện. */
class WsSession {
  readonly frames: Frame[] = []
  private constructor(readonly socket: WebSocket) {}

  static async open(url: string, headers?: Record<string, string>): Promise<WsSession> {
    const socket = new WebSocket(url, headers ? { headers } : undefined)
    const session = new WsSession(socket)
    socket.on('message', (raw: Buffer) => {
      session.frames.push(JSON.parse(raw.toString('utf8')) as Frame)
    })
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve)
      socket.once('error', reject)
    })
    return session
  }

  send(frame: Frame): void {
    this.socket.send(JSON.stringify(frame))
  }

  chunksOf(id: string): Array<{ seq: number; data: unknown }> {
    return this.frames.filter(
      (f): f is Extract<Frame, { t: 'chunk' }> => f.t === 'chunk' && f.id === id,
    )
  }

  async waitFor(pred: () => boolean, label: string, timeoutMs = 20_000): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (!pred()) {
      if (Date.now() > deadline) throw new Error(`Quá hạn chờ: ${label}`)
      await new Promise((r) => setTimeout(r, 5))
    }
  }

  close(): void {
    this.socket.close()
  }
}

interface ChunkData {
  seq: number
  rows: unknown[][]
  done: boolean
  columns?: Array<{ name: string }>
  stats?: { rowCount: number; truncated?: boolean }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('corvus')
    .withUsername('corvus')
    .withPassword('corvus')
    .start()

  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'corvus-ws-it-'))
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

  const mod = await import('../index')
  const port = 8600 + Math.floor(Math.random() * 300)
  baseUrl = `http://127.0.0.1:${port}`
  wsUrl = `ws://127.0.0.1:${port}/ws`
  server = await mod.createWebServer(port)
  shutdown = mod.shutdown
}, 240_000)

afterAll(async () => {
  await shutdown?.(server)
  await container?.stop()
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true })
})

describe('T-B05 · bắt tay WebSocket tại /ws', () => {
  it('nối được tới /ws và ping/pong hoạt động', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({ t: 'ping' })
    await s.waitFor(() => s.frames.some((f) => f.t === 'pong'), 'pong')
    s.close()
  })

  it('đường dẫn khác /ws bị từ chối, không nâng cấp bừa', async () => {
    const socket = new WebSocket(wsUrl.replace('/ws', '/khong-phai-ws'))
    const err = await new Promise<Error>((resolve) => {
      socket.once('error', resolve)
      socket.once('open', () => resolve(new Error('KHÔNG được mở')))
    })
    expect(err.message).not.toBe('KHÔNG được mở')
    socket.close()
  })

  it('origin lạ bị từ chối — trình duyệt KHÔNG áp CORS cho WebSocket', async () => {
    const socket = new WebSocket(wsUrl, { headers: { Origin: 'https://ke-tan-cong.example' } })
    const err = await new Promise<Error>((resolve) => {
      socket.once('error', resolve)
      socket.once('open', () => resolve(new Error('KHÔNG được mở')))
    })
    expect(err.message).not.toBe('KHÔNG được mở')
    expect(err.message).toContain('403')
    socket.close()
  })

  it('origin của chính app (dev 5173) được chấp nhận', async () => {
    const s = await WsSession.open(wsUrl, { Origin: 'http://localhost:5173' })
    s.send({ t: 'ping' })
    await s.waitFor(() => s.frames.some((f) => f.t === 'pong'), 'pong')
    s.close()
  })
})

describe('T-B05 · query.execute qua WebSocket trên PostgreSQL thật', () => {
  it('trả đúng dữ liệu, chia chunk đúng chunkSize, seq liên tục, chunk cuối done=true', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'q1',
      method: 'query.execute',
      params: {
        connectionId: 'pg',
        sql: 'SELECT g AS n, (g * 2)::text AS d FROM generate_series(1, 2500) g ORDER BY g',
        chunkSize: 1_000,
      },
    })

    await s.waitFor(() => s.frames.some((f) => f.t === 'end' && f.id === 'q1'), 'khung end')

    const chunks = s.chunksOf('q1')
    expect(chunks.map((c) => c.seq)).toEqual([0, 1, 2])

    const data = chunks.map((c) => c.data as ChunkData)
    expect(data.map((d) => d.rows.length)).toEqual([1_000, 1_000, 500])
    expect(data.at(-1)?.done).toBe(true)
    expect(data[0]?.columns?.map((c) => c.name)).toEqual(['n', 'd'])

    // Dữ liệu THẬT từ PostgreSQL, không phải fixture.
    expect(data[0]?.rows[0]).toEqual([{ k: 'num', v: 1 }, { k: 'str', v: '2' }])
    expect(data.at(-1)?.stats?.rowCount).toBe(2_500)

    expect(s.frames.some((f) => f.t === 'error')).toBe(false)
    s.close()
  })

  it('maxRows cắt kết quả và bật stats.truncated', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'q2',
      method: 'query.execute',
      params: {
        connectionId: 'pg',
        sql: 'SELECT g FROM generate_series(1, 50000) g',
        chunkSize: 500,
        maxRows: 1_200,
      },
    })
    await s.waitFor(() => s.frames.some((f) => f.t === 'end' && f.id === 'q2'), 'khung end')

    const data = s.chunksOf('q2').map((c) => c.data as ChunkData)
    expect(data.reduce((n, d) => n + d.rows.length, 0)).toBe(1_200)
    expect(data.at(-1)?.stats?.truncated).toBe(true)
    s.close()
  })

  it('lỗi SQL trả khung error có mã CorvusError, không phải Error thô', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'q3',
      method: 'query.execute',
      params: { connectionId: 'pg', sql: 'SELECT * FROM bang_khong_ton_tai' },
    })
    await s.waitFor(() => s.frames.some((f) => f.t === 'error' && f.id === 'q3'), 'khung error')

    const frame = s.frames.find((f) => f.t === 'error') as { error: Record<string, unknown> }
    expect(typeof frame.error.code).toBe('string')
    expect(frame.error.code).not.toBe('INTERNAL_ERROR')
    expect(String(frame.error.message)).toBeTruthy()
    s.close()
  })

  it('method chưa có handler trả UNSUPPORTED_FEATURE, không im lặng', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'q4',
      method: 'data.browse',
      params: { connectionId: 'pg', ref: { table: 'x' } },
    })
    await s.waitFor(() => s.frames.some((f) => f.t === 'error' && f.id === 'q4'), 'khung error')
    const frame = s.frames.find((f) => f.t === 'error') as { error: { code: string } }
    expect(['UNSUPPORTED_FEATURE', 'INVALID_INPUT']).toContain(frame.error.code)
    s.close()
  })

  it('params sai bị chặn ở validate, không chạm database', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({ t: 'open', id: 'q5', method: 'query.execute', params: { sql: 'SELECT 1' } })
    await s.waitFor(() => s.frames.some((f) => f.t === 'error' && f.id === 'q5'), 'khung error')
    const frame = s.frames.find((f) => f.t === 'error') as { error: { code: string } }
    expect(frame.error.code).toBe('INVALID_INPUT')
    s.close()
  })
})

describe('T-B05 · backpressure và dọn dẹp trên socket thật', () => {
  it('client không ack → server dừng ở cửa sổ 8 chunk', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'bp',
      method: 'query.execute',
      params: {
        connectionId: 'pg',
        sql: 'SELECT g FROM generate_series(1, 1000000) g',
        chunkSize: 1_000,
      },
    })

    await s.waitFor(() => s.chunksOf('bp').length >= 8, '8 chunk đầu')
    const stalled = s.chunksOf('bp').length

    // Để yên một lúc: nếu backpressure hỏng, cả triệu dòng sẽ đổ về đây.
    await new Promise((r) => setTimeout(r, 500))
    expect(s.chunksOf('bp').length).toBe(stalled)
    expect(stalled).toBe(8)

    // Ack một lần → chính xác 4 chunk nữa.
    s.send({ t: 'ack', id: 'bp', seq: 7 })
    await s.waitFor(() => s.chunksOf('bp').length === 12, '4 chunk sau ack')
    await new Promise((r) => setTimeout(r, 300))
    expect(s.chunksOf('bp').length).toBe(12)

    s.send({ t: 'cancel', id: 'bp' })
    s.close()
  })

  it('client chết giữa stream → server dọn sạch và vẫn phục vụ tiếp', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'kill',
      method: 'query.execute',
      params: {
        connectionId: 'pg',
        sql: 'SELECT g FROM generate_series(1, 1000000) g',
        chunkSize: 1_000,
      },
    })
    await s.waitFor(() => s.chunksOf('kill').length >= 8, 'stream đã chạy')

    // Giết socket không báo trước — đúng kịch bản tab bị đóng / mạng rớt.
    s.socket.terminate()

    // Server phải còn sống: một stream mới chạy trọn vẹn ngay sau đó.
    const s2 = await WsSession.open(wsUrl)
    s2.send({
      t: 'open',
      id: 'after',
      method: 'query.execute',
      params: { connectionId: 'pg', sql: 'SELECT 42 AS answer', chunkSize: 1_000 },
    })
    await s2.waitFor(() => s2.frames.some((f) => f.t === 'end' && f.id === 'after'), 'stream mới xong')
    const rows = (s2.chunksOf('after')[0]?.data as ChunkData).rows
    expect(rows).toEqual([[{ k: 'num', v: 42 }]])
    s2.close()
  }, 60_000)

  it('huỷ giữa chừng dừng hẳn dòng chunk, không gửi thêm gì', async () => {
    const s = await WsSession.open(wsUrl)
    s.send({
      t: 'open',
      id: 'cx',
      method: 'query.execute',
      params: {
        connectionId: 'pg',
        sql: 'SELECT g FROM generate_series(1, 1000000) g',
        chunkSize: 1_000,
      },
    })
    await s.waitFor(() => s.chunksOf('cx').length > 0, 'chunk đầu')

    s.send({ t: 'cancel', id: 'cx' })
    // Cho phép các chunk đang bay tới nơi rồi chốt số.
    await new Promise((r) => setTimeout(r, 300))
    const after = s.chunksOf('cx').length
    await new Promise((r) => setTimeout(r, 500))

    expect(s.chunksOf('cx').length).toBe(after)
    // Huỷ không phải lỗi: không có khung end, cũng không có khung error.
    expect(s.frames.some((f) => f.t === 'end' && f.id === 'cx')).toBe(false)
    expect(s.frames.some((f) => f.t === 'error' && f.id === 'cx')).toBe(false)
    s.close()
  })

  it('HTTP RPC vẫn hoạt động bình thường sau mọi phiên WebSocket ở trên', async () => {
    const res = await fetch(`${baseUrl}/rpc/connection.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(res.ok).toBe(true)
    expect(await res.json()).toHaveLength(1)
  })
})
