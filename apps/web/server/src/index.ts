import { pathToFileURL } from 'node:url'
import http from 'node:http'
import { HttpRpcServer } from '@corvus/transport-http/server'
import { buildEngine } from './engine'

// Engine THẬT: workspace SQLite + vault + driver PostgreSQL + router có handler.
// (Trước đây chỗ này là một mock router echo — xem audit-2026-08-18.md.)
export const engine = buildEngine()
export const rpcServer = new HttpRpcServer(engine.router)

/**
 * Origin duoc phep goi RPC.
 *
 * KHONG dung '*': server nay giu thong tin dang nhap database production. Cho phep moi
 * origin nghia la bat ky trang web nao nguoi dung dang mo cung goi duoc RPC bang cookie
 * cua ho (security.md TM-4). Chi mo dung origin cua chinh app.
 */
function allowedOrigins(): string[] {
  const base = process.env.CORVUS_BASE_URL
  const extra = (process.env.CORVUS_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const dev = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']
  return [...(base ? [base] : []), ...extra, ...dev]
}

export function createWebServer(port = 8080) {
  const origins = allowedOrigins()
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin
    if (origin && origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id, X-CSRF-Token')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'POST' && req.url?.startsWith('/rpc/')) {
      const method = req.url.slice('/rpc/'.length)
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', async () => {
        try {
          const params = body ? JSON.parse(body) : {}
          const result = await rpcServer.handleUnary(method, params)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (err: unknown) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
        }
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  return new Promise<http.Server>((resolve) => {
    server.listen(port, () => {
      resolve(server)
    })
  })
}

// ── Entry point ──────────────────────────────────────────────────────────────
// Truoc day file nay chi export createWebServer ma khong ai goi, nen `pnpm dev:web`
// khoi dong tsx roi khong listen gi ca (audit-2026-08-18.md).
// Guard `import.meta.main` de import module trong test khong lam server chay len.
const isEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

/**
 * Đóng gọn: dừng HTTP, đóng session tới database, đóng workspace.db.
 *
 * Không có bước này thì `workspace.db` bị giữ khoá sau khi process kết thúc logic
 * (Windows báo EBUSY khi xoá) và các kết nối tới database không được trả về sạch sẽ.
 * Docker gửi SIGTERM khi `docker stop` nên đây là đường thoát chuẩn của production.
 */
export async function shutdown(server?: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
  await engine.close()
}

if (isEntry) {
  const port = Number(process.env.CORVUS_PORT ?? 8080)
  createWebServer(port).then((server) => {
    // eslint-disable-next-line no-console -- entry point cua server, log khoi dong la dung
    console.log(`[corvus] RPC server dang lang nghe tai http://127.0.0.1:${port}/rpc`)

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void shutdown(server).then(() => process.exit(0))
      })
    }
  })
}
