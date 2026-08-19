import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { ConnectionProfile, ResultChunk } from '@corvus/contract'
import { registerDriver, driverRegistry } from '@corvus/driver-core'
import { postgresDriver } from '@corvus/driver-postgres'
import type { DriverConnection } from '@corvus/driver-core'
import type { SecretRef, SecretVault } from '@corvus/storage'
import { EngineRouter } from '../router'
import { SessionManager } from '../session'
import { registerHandlers, type ConnectionStore } from '../handlers'

/**
 * T-B05 — handler stream `query.execute` chạy thật trên PostgreSQL.
 *
 * Ở đây kiểm những bất biến của streaming-and-jobs.md §A.3 mà chỉ database THẬT mới
 * chứng minh được: cursor có đóng không, CANCEL có tới server không, RAM có phẳng không.
 */
let container: StartedPostgreSqlContainer
let router: EngineRouter
let sessions: SessionManager

const CONNECTION_ID = 'conn-stream'

const profile: ConnectionProfile = {
  id: CONNECTION_ID,
  name: 'PostgreSQL stream test',
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

/**
 * Đếm backend PostgreSQL đang chạy query khớp mẫu — dùng để chứng minh không rò session.
 * Phải dùng một KẾT NỐI KHÁC: kết nối đang chạy query thì không trả lời được gì.
 */
let probe: DriverConnection

async function activeQueries(pattern: string): Promise<number> {
  let count = 0
  for await (const chunk of probe.execute({
    sql: `SELECT count(*) FROM pg_stat_activity
           WHERE state = 'active' AND query LIKE $1 AND pid <> pg_backend_pid()`,
    values: [pattern],
  })) {
    for (const row of chunk.rows) {
      const cell = row[0] as { k: string; v?: unknown }
      count = Number(cell.v ?? 0)
    }
  }
  return count
}

async function until(cond: () => Promise<boolean> | boolean, label: string, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (await cond()) return
    if (Date.now() > deadline) throw new Error(`Quá hạn chờ: ${label}`)
    await new Promise((r) => setTimeout(r, 10))
  }
}

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

  probe = await postgresDriver.connect({ ...profile, id: 'probe', password: 'corvus' })

  sessions = new SessionManager()
  router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault })
}, 180_000)

afterAll(async () => {
  await probe?.close()
  await sessions?.closeAll?.()
  await container?.stop()
})

describe('T-B05 · query.execute qua EngineRouter.handleStream', () => {
  it('chia chunk đúng chunkSize, seq liên tục, chunk cuối done=true', async () => {
    const chunks: ResultChunk[] = []
    for await (const c of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT g AS n, g::text AS s FROM generate_series(1, 2500) g',
      chunkSize: 1_000,
    })) {
      chunks.push(c as ResultChunk)
    }

    expect(chunks.map((c) => c.seq)).toEqual([0, 1, 2])
    expect(chunks.map((c) => c.rows.length)).toEqual([1_000, 1_000, 500])
    expect(chunks.at(-1)?.done).toBe(true)
    expect(chunks.slice(0, -1).every((c) => c.done === false)).toBe(true)
    // Metadata cột chỉ đi kèm chunk đầu, không lặp lại 2 500 lần.
    expect(chunks[0]?.columns?.map((c) => c.name)).toEqual(['n', 's'])
    expect(chunks[1]?.columns).toBeUndefined()
    expect(chunks.at(-1)?.stats?.rowCount).toBe(2_500)
  })

  it('maxRows cắt kết quả và bật stats.truncated', async () => {
    const chunks: ResultChunk[] = []
    for await (const c of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT g FROM generate_series(1, 10000) g',
      chunkSize: 500,
      maxRows: 1_200,
    })) {
      chunks.push(c as ResultChunk)
    }

    const total = chunks.reduce((n, c) => n + c.rows.length, 0)
    expect(total).toBe(1_200)
    expect(chunks.at(-1)?.done).toBe(true)
    expect(chunks.at(-1)?.stats?.truncated).toBe(true)
    expect(chunks.at(-1)?.stats?.rowCount).toBe(1_200)
  })

  it('không truncated khi kết quả nhỏ hơn maxRows', async () => {
    const chunks: ResultChunk[] = []
    for await (const c of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT g FROM generate_series(1, 10) g',
      chunkSize: 1_000,
      maxRows: 1_000,
    })) {
      chunks.push(c as ResultChunk)
    }
    expect(chunks.at(-1)?.stats?.truncated).toBe(false)
  })

  it('lỗi SQL đi ra dưới dạng CorvusError có mã, không phải Error thô', async () => {
    const iter = router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT * FROM bang_khong_ton_tai',
    })
    await expect(
      (async () => {
        for await (const _ of iter) {
          /* phải ném trước khi có chunk nào */
        }
      })(),
    ).rejects.toMatchObject({ code: expect.any(String) })
  })

  it('params bị validate trước khi chạm database', async () => {
    const iter = router.handleStream('query.execute', { sql: 'SELECT 1' })
    await expect(
      (async () => {
        for await (const _ of iter) {
          /* không tới đây */
        }
      })(),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('huỷ giữa chừng → CANCEL tới PostgreSQL và không rò session (IV-3)', async () => {
    const abort = new AbortController()
    const MARKER = '/* corvus-cancel-probe */'

    const run = (async () => {
      for await (const _ of router.handleStream(
        'query.execute',
        {
          connectionId: CONNECTION_ID,
          sql: `${MARKER} SELECT pg_sleep(30)`,
        },
        undefined,
        { signal: abort.signal },
      )) {
        /* query này không bao giờ trả dòng trước khi bị huỷ */
      }
    })()
    run.catch(() => {
      /* huỷ làm promise reject — xử lý ở dưới */
    })

    await until(async () => (await activeQueries(`%${MARKER}%`)) > 0, 'query bắt đầu chạy')

    const t0 = Date.now()
    abort.abort()
    await expect(run).rejects.toMatchObject({ code: 'QUERY_CANCELLED' })
    const elapsed = Date.now() - t0

    // IV-3: ≤ 200 ms.
    expect(elapsed).toBeLessThanOrEqual(200)
    // Backend phải thực sự dừng — nếu chỉ client bỏ đọc thì pg_sleep(30) vẫn chạy tiếp.
    await until(async () => (await activeQueries(`%${MARKER}%`)) === 0, 'backend đã dừng', 1_000)
  })

  it('người tiêu thụ break giữa chừng → cursor đóng, connection trả về pool', async () => {
    const MARKER = '/* corvus-break-probe */'
    for await (const _ of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: `${MARKER} SELECT g FROM generate_series(1, 5000000) g`,
      chunkSize: 1_000,
    })) {
      break // for-await gọi generator.return() → chạy `finally` của driver
    }

    await until(async () => (await activeQueries(`%${MARKER}%`)) === 0, 'backend nhả ra sau break', 2_000)

    // Pool còn dùng được ngay sau đó — chứng minh client đã release, không bị giữ.
    const chunks: ResultChunk[] = []
    for await (const c of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT 1 AS ok',
    })) {
      chunks.push(c as ResultChunk)
    }
    expect(chunks.at(-1)?.stats?.rowCount).toBe(1)
  })

  it('stream 1 000 000 dòng: RAM engine phẳng (IV-1/IV-2)', async () => {
    global.gc?.()
    const before = process.memoryUsage().heapUsed
    let peak = before
    let rows = 0

    for await (const c of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT g AS n, g::text AS s, g % 7 AS m FROM generate_series(1, 1000000) g',
      chunkSize: 1_000,
      maxRows: 1_000_000,
    })) {
      // Người tiêu thụ KHÔNG giữ chunk lại — đúng như transport: gửi đi rồi thả.
      rows += (c as ResultChunk).rows.length
      const now = process.memoryUsage().heapUsed
      if (now > peak) peak = now
    }

    expect(rows).toBe(1_000_000)
    const peakMb = (peak - before) / 1024 / 1024
    // NFR-03 cho 10 triệu dòng là 400 MB; 1 triệu dòng phải thoải mái dưới đó.
    // Ngưỡng rộng vì GC không tất định — điều cần bắt là "buffer cả result set", nghĩa là
    // hàng GB, chứ không phải dao động vài chục MB.
    expect(peakMb).toBeLessThan(200)
  }, 120_000)
})
