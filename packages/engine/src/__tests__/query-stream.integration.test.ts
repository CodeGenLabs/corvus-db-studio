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

/**
 * Chế độ read-only — security.md §5.
 *
 * Trước bản vá 2026-08-19, `profile.readOnly` chỉ được đọc trong `beginTransaction()`, nên
 * một `DELETE` đi qua `query.execute` XOÁ DỮ LIỆU THẬT trên connection đã bật read-only
 * (đo được: 2 dòng → 1 dòng, không lỗi nào được ném). Bộ test này ghim cả hai lớp phòng thủ.
 */
describe('read-only · query.execute trên connection chỉ đọc', () => {
  const RO_ID = 'conn-readonly'

  const roProfile: ConnectionProfile = {
    ...profile,
    id: RO_ID,
    name: 'PostgreSQL read-only',
    readOnly: true,
  }

  let roRouter: EngineRouter
  let roSessions: SessionManager

  beforeAll(async () => {
    roProfile.host = profile.host
    roProfile.port = profile.port
    await vault.set({ kind: 'db-password', ownerId: 'local-owner', connectionId: RO_ID }, 'corvus')

    roSessions = new SessionManager()
    roRouter = new EngineRouter()
    registerHandlers(roRouter, {
      sessions: roSessions,
      connections: {
        async list() {
          return [roProfile]
        },
        async get(id) {
          return id === RO_ID ? roProfile : undefined
        },
      },
      vault,
    })

    // Dữ liệu thử, dựng bằng kết nối read-write riêng.
    for (const sql of [
      'DROP TABLE IF EXISTS ro_guard',
      'CREATE TABLE ro_guard (id int primary key, note text)',
      "INSERT INTO ro_guard VALUES (1, 'phai con lai'), (2, 'phai con lai')",
    ]) {
      for await (const _ of probe.execute({ sql })) {
        /* DDL */
      }
    }
  }, 60_000)

  afterAll(async () => {
    await roSessions?.closeAll?.()
  })

  async function runRo(sql: string): Promise<ResultChunk[]> {
    const out: ResultChunk[] = []
    for await (const c of roRouter.handleStream('query.execute', { connectionId: RO_ID, sql })) {
      out.push(c as ResultChunk)
    }
    return out
  }

  async function countRows(): Promise<number> {
    let n = -1
    for await (const chunk of probe.execute({ sql: 'SELECT count(*)::int AS n FROM ro_guard' })) {
      for (const row of chunk.rows) {
        n = Number((row[0] as { v?: unknown }).v ?? -1)
      }
    }
    return n
  }

  it('SELECT vẫn chạy bình thường', async () => {
    const chunks = await runRo('SELECT id FROM ro_guard ORDER BY id')
    expect(chunks.flatMap((c) => c.rows)).toHaveLength(2)
  })

  it('DELETE bị từ chối bằng READ_ONLY và KHÔNG xoá dòng nào', async () => {
    await expect(runRo('DELETE FROM ro_guard WHERE id = 1')).rejects.toMatchObject({
      code: 'READ_ONLY',
    })
    // Khẳng định dương: dữ liệu còn nguyên. Chỉ kiểm "có ném lỗi" là không đủ — bản lỗi
    // trước đây KHÔNG ném gì cả mà vẫn xoá.
    expect(await countRows()).toBe(2)
  })

  it('UPDATE, INSERT, DROP đều bị từ chối và dữ liệu không đổi', async () => {
    for (const sql of [
      "UPDATE ro_guard SET note = 'bi sua' WHERE id = 1",
      "INSERT INTO ro_guard VALUES (3, 'moi')",
      'DROP TABLE ro_guard',
      'TRUNCATE ro_guard',
    ]) {
      await expect(runRo(sql)).rejects.toMatchObject({ code: 'READ_ONLY' })
    }
    expect(await countRows()).toBe(2)
  })

  it('CTE ghi dữ liệu của PostgreSQL bị chặn — mở đầu WITH, kết thúc SELECT', async () => {
    await expect(
      runRo('WITH d AS (DELETE FROM ro_guard RETURNING *) SELECT count(*) FROM d'),
    ).rejects.toMatchObject({ code: 'READ_ONLY' })
    expect(await countRows()).toBe(2)
  })

  it('lớp 2 độc lập: server từ chối ghi ngay cả khi bỏ qua bộ phân loại của engine', async () => {
    // Gọi thẳng driver, không đi qua handler — chứng minh `default_transaction_read_only`
    // đã được đặt ở tầng session, chứ không phải chỉ có lớp phân loại SQL.
    const conn = await postgresDriver.connect({ ...roProfile, password: 'corvus' })
    try {
      await expect(
        (async () => {
          for await (const _ of conn.execute({ sql: 'DELETE FROM ro_guard WHERE id = 2' })) {
            /* chờ lỗi từ server */
          }
        })(),
      ).rejects.toMatchObject({ name: 'CorvusError' })
    } finally {
      await conn.close()
    }
    expect(await countRows()).toBe(2)
  })
})

/**
 * Giới hạn an toàn của streaming-and-jobs.md §A.4 — trước bản vá KHÔNG cái nào được thực thi
 * (`grep -rn "MAX_CONCURRENT|maxStreams|statement_timeout"` trên engine + transport + driver
 * trả về rỗng).
 */
describe('giới hạn an toàn của stream (§A.4)', () => {
  it('quá 4 stream đồng thời trên một connection thì bị từ chối, không xếp hàng vô hạn', async () => {
    // Pool PostgreSQL chỉ có 8 slot: không có trần thì stream thứ 9 chờ mãi, còn RAM engine
    // phình theo số stream × cửa sổ 8 chunk.
    const iterators = []
    try {
      for (let i = 0; i < 4; i++) {
        const stream = router.handleStream('query.execute', {
          connectionId: CONNECTION_ID,
          sql: 'SELECT generate_series(1, 200000) AS n',
          chunkSize: 1,
        })
        const it = stream[Symbol.asyncIterator]()
        // Kéo đúng 1 chunk để stream thật sự đang mở, rồi giữ nguyên.
        await it.next()
        iterators.push(it)
      }

      await expect(
        (async () => {
          for await (const _ of router.handleStream('query.execute', {
            connectionId: CONNECTION_ID,
            sql: 'SELECT 1',
          })) {
            /* không nên tới đây */
          }
        })(),
      ).rejects.toMatchObject({ code: 'UNSUPPORTED_FEATURE' })
    } finally {
      // Đóng cả 4 → slot phải được trả lại.
      for (const it of iterators) await it.return?.()
    }

    // Sau khi giải phóng, stream mới chạy được bình thường. Nếu bộ đếm không giảm trong
    // `finally`, connection sẽ bị khoá vĩnh viễn — lỗi tệ hơn cả việc không có trần.
    const chunks = []
    for await (const c of router.handleStream('query.execute', {
      connectionId: CONNECTION_ID,
      sql: 'SELECT 1 AS n',
    })) {
      chunks.push(c)
    }
    expect(chunks.length).toBeGreaterThan(0)
  }, 60_000)

  it('maxRows vượt trần bị contract chặn ở tầng validate params', async () => {
    await expect(
      (async () => {
        for await (const _ of router.handleStream('query.execute', {
          connectionId: CONNECTION_ID,
          sql: 'SELECT 1',
          maxRows: 100_000_000,
        })) {
          /* không nên tới đây */
        }
      })(),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })
})
