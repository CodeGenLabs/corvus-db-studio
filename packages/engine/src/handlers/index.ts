import { corvusError, errorMessage } from '@corvus/contract'
import { getDriver } from '@corvus/driver-core'
import type { EngineRouter } from '../router'
import { draftToResolvedProfile, resolveConnection, type HandlerDeps } from './context'

/**
 * Trần mặc định cho `query.execute` (streaming-and-jobs.md §A.4).
 *
 * Contract để `maxRows` optional, nhưng nếu engine cũng để trống thì một `SELECT *` trên
 * bảng 50 triệu dòng sẽ chạy tới hết. Mặc định phải AN TOÀN: cắt và bật `stats.truncated`
 * để UI hiện banner, thay vì im lặng kéo cả bảng về.
 */
const DEFAULT_QUERY_MAX_ROWS = 500_000

export type { ConnectionStore, HandlerDeps } from './context'

/**
 * Đăng ký các handler RPC đã hiện thực THẬT.
 *
 * Trước đây router có `registerUnary` nhưng không handler nào được đăng ký — 0/76 method
 * chạy được (audit 2026-08-18). Đây là 5 method đầu tiên có kết nối database thật, đủ để
 * UI hiện danh sách bảng từ một PostgreSQL thật (task R-08).
 *
 * Mỗi khi thêm handler, hạ `HANDLER_DEBT` trong `tools/check-contract.ts`.
 */
export function registerHandlers(router: EngineRouter, deps: HandlerDeps): void {
  // ── connection.list ────────────────────────────────────────────────────────
  // Gốc của cây điều hướng. KHÔNG trả về mật khẩu — profile trong store vốn không chứa
  // secret (security.md §2, bất biến 2).
  router.registerUnary('connection.list', async (_params, ctx) => {
    return deps.connections.list(ctx.actor.id)
  })

  // ── connection.test ────────────────────────────────────────────────────────
  // Thử kết nối bằng cấu hình chưa lưu (nút Test trong dialog) hoặc profile đã lưu.
  router.registerUnary('connection.test', async (params, ctx) => {
    const draft = params as Parameters<typeof draftToResolvedProfile>[0]

    // Nếu chỉ có id thì lấy profile + secret đã lưu; nếu không thì dùng cấu hình nháp.
    let resolved
    if (draft.id && !draft.host && !draft.database) {
      const profile = await deps.connections.get(draft.id)
      if (!profile) throw corvusError('NOT_FOUND', `Không tìm thấy kết nối '${draft.id}'`)
      const password = await deps.vault.get({
        kind: 'db-password',
        ownerId: ctx.actor.id,
        connectionId: draft.id,
      })
      resolved = { ...profile, password }
    } else {
      resolved = draftToResolvedProfile(draft)
    }

    const driver = getDriver(resolved.driverId)
    if (!driver) {
      return { ok: false, error: `Chưa hỗ trợ engine '${resolved.driverId}'` }
    }

    const t0 = Date.now()
    let conn
    try {
      conn = await driver.connect(resolved)
      const latencyMs = await conn.ping()
      return { ok: true, version: conn.serverVersion.raw, latencyMs }
    } catch (err) {
      // Trả về kết quả ok:false thay vì ném: người dùng bấm Test là để BIẾT lỗi gì,
      // không phải để nhận một dialog lỗi chung.
      return { ok: false, error: errorMessage(err), latencyMs: Date.now() - t0 }
    } finally {
      // Kết nối thử phải đóng ngay, không giữ trong SessionManager.
      await conn?.close().catch(() => {
        /* đóng kết nối thử thất bại không ảnh hưởng kết quả test */
      })
    }
  })

  // ── connection.open ────────────────────────────────────────────────────────
  router.registerUnary('connection.open', async (params, ctx) => {
    const { id } = params as { id: string }
    const conn = await resolveConnection(deps, id, ctx.actor.id)
    const session = deps.sessions.getSession(id)
    return {
      sessionId: session?.sessionId ?? id,
      // capabilities của CONNECTION (đã thu hẹp theo server thật), không phải của driver
      // — ADR-0003 / capability-matrix.md §8.
      capabilities: conn.capabilities as unknown as Record<string, unknown>,
    }
  })

  // ── introspect.databases ───────────────────────────────────────────────────
  router.registerUnary('introspect.databases', async (params, ctx) => {
    const { connectionId } = params as { connectionId: string }
    const conn = await resolveConnection(deps, connectionId, ctx.actor.id)
    return conn.introspect.listDatabases()
  })

  // ── introspect.objects ─────────────────────────────────────────────────────
  router.registerUnary('introspect.objects', async (params, ctx) => {
    const p = params as { connectionId: string; database?: string; schema?: string; kind?: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const objects = await conn.introspect.listObjects({
      database: p.database,
      schema: p.schema,
      kind: p.kind,
    })
    // Schema của contract không có `comment`; bỏ đi thay vì để result validation fail.
    return objects.map((o) => ({
      name: o.name,
      kind: o.kind,
      rows: o.rows,
      size: o.size,
      engine: o.engine,
      modified: o.modified,
    }))
  })

  // ── introspect.tableMeta ───────────────────────────────────────────────────
  router.registerUnary('introspect.tableMeta', async (params, ctx) => {
    const p = params as { connectionId: string; database?: string; schema?: string; table: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    return conn.introspect.getTableMeta({
      database: p.database,
      schema: p.schema,
      table: p.table,
    })
  })

  // ── introspect.schemas ─────────────────────────────────────────────────────
  router.registerUnary('introspect.schemas', async (params, ctx) => {
    const p = params as { connectionId: string; database?: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    return conn.introspect.listSchemas(p.database)
  })

  // ── query.execute (STREAM) ─────────────────────────────────────────────────
  // Handler stream đầu tiên của hệ thống. `yield*` đi thẳng vào cursor của driver: engine
  // KHÔNG gom chunk lại, không đếm, không đệm — đó là điều kiện để `SELECT *` trên bảng
  // lớn chạy với RAM phẳng (coding-rules 3.6 / streaming-and-jobs IV-1, IV-2).
  //
  // `signal` đến từ khung `cancel` hoặc từ socket đứt. Driver dùng nó để gửi
  // `pg_cancel_backend` và đóng cursor (IV-3, ≤ 200 ms).
  router.registerStream('query.execute', async function* (params, ctx, opts) {
    const p = params as {
      connectionId: string
      sql: string
      params?: unknown[]
      chunkSize?: number
      maxRows?: number
    }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    yield* conn.execute({
      sql: p.sql,
      values: p.params,
      chunkSize: p.chunkSize,
      maxRows: p.maxRows ?? DEFAULT_QUERY_MAX_ROWS,
      signal: opts.signal,
    })
  })
}
