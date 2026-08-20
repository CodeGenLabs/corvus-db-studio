import { pathToFileURL } from 'node:url'
import { timingSafeEqual } from 'node:crypto'
import http from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import { HttpRpcServer, type WsConnection, toWireError } from '@corvus/transport-http/server'
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

/**
 * Địa chỉ lắng nghe.
 *
 * Mặc định **loopback**. Bản trước gọi `server.listen(port)` không truyền host, nên Node bind
 * `0.0.0.0` — server mở ra toàn mạng LAN trong khi dòng log lại in `127.0.0.1`. Với một
 * process giữ mật khẩu database production và KHÔNG có xác thực, đó là mở cửa cho bất kỳ máy
 * nào cùng mạng chạy SQL tuỳ ý (security.md §8).
 */
function resolveHost(): string {
  return process.env.CORVUS_HOST ?? '127.0.0.1'
}

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost'])

/**
 * Token xác thực cho `/rpc` và `/ws`.
 *
 * Bind ra ngoài loopback mà không có token thì server TỪ CHỐI khởi động — cùng nguyên tắc với
 * `CORVUS_MASTER_KEY`: thà không chạy còn hơn chạy ở trạng thái không an toàn mà không ai biết.
 */
function resolveAuthToken(host: string): string | undefined {
  const token = process.env.CORVUS_AUTH_TOKEN
  if (token && token.length > 0) {
    if (token.length < 32) {
      throw new Error('CORVUS_AUTH_TOKEN phải dài ít nhất 32 ký tự.')
    }
    return token
  }
  if (!LOOPBACK.has(host)) {
    throw new Error(
      `Server được yêu cầu lắng nghe tại '${host}' (ngoài loopback) nhưng thiếu CORVUS_AUTH_TOKEN. ` +
        'Từ chối khởi động: /rpc và /ws chạy SQL trên database production và không có lớp xác thực nào khác.',
    )
  }
  return undefined
}

/** So sánh token chống tấn công đo thời gian. Độ dài khác nhau → sai ngay. */
function tokenMatches(expected: string, got: string | undefined): boolean {
  if (got === undefined) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(got)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Lấy token client gửi lên.
 *
 * Chấp nhận header (client không phải trình duyệt) và query `?token=` (trình duyệt KHÔNG đặt
 * được header khi mở WebSocket). Query param đi vào access log của proxy nên chỉ là phương án
 * dự phòng — khi có luồng đăng nhập thật thì bỏ nhánh này.
 */
function extractToken(req: http.IncomingMessage): string | undefined {
  const auth = req.headers.authorization
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7)
  const header = req.headers['x-corvus-token']
  if (typeof header === 'string' && header.length > 0) return header
  const url = req.url ?? ''
  const q = url.indexOf('?')
  if (q !== -1) {
    const value = new URLSearchParams(url.slice(q + 1)).get('token')
    if (value) return value
  }
  return undefined
}

export function createWebServer(port = 8080, host = resolveHost()) {
  const origins = allowedOrigins()
  const authToken = resolveAuthToken(host)
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin
    if (origin && origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Request-Id, X-CSRF-Token, X-Corvus-Token, Authorization',
    )

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (authToken !== undefined && !tokenMatches(authToken, extractToken(req))) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Thiếu hoặc sai token' }))
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
          const wireErr = toWireError(err)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(wireErr))
        }
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  })

  attachWebSocket(server, origins, authToken)

  return new Promise<http.Server>((resolve) => {
    // Truyền host TƯỜNG MINH: thiếu tham số này Node bind mọi interface.
    server.listen(port, host, () => {
      resolve(server)
    })
  })
}

/**
 * Bọc `WebSocket` của thư viện `ws` thành `WsConnection` mà transport hiểu.
 *
 * Lớp bọc mỏng này là chỗ duy nhất `ws` xuất hiện với transport: `@corvus/transport-http`
 * không phụ thuộc `ws`, nên bản desktop (IPC) và test (socket giả) dùng lại được nguyên
 * `HttpRpcServer` (ADR-0002).
 */
function toWsConnection(socket: WebSocket): WsConnection {
  return {
    get isOpen() {
      return socket.readyState === socket.OPEN
    },
    send(data: string) {
      socket.send(data)
    },
    on(event: 'message' | 'close', cb: (data: string) => void) {
      if (event === 'message') {
        // `ws` giao Buffer khi peer gửi frame nhị phân; framing của ta là JSON text nên
        // chuẩn hoá về string ngay tại biên, đừng để `JSON.parse(Buffer)` ở tầng trong.
        socket.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
          cb(Array.isArray(raw) ? Buffer.concat(raw).toString('utf8') : Buffer.from(raw as Buffer).toString('utf8'))
        })
      } else {
        socket.on('close', () => cb(''))
      }
    },
  }
}

/**
 * Gắn WebSocket server vào `/ws` (rpc-contract.md §5.1).
 *
 * `noServer: true` + tự xử lý 'upgrade' là bắt buộc: nếu để `ws` tự nghe cả server thì
 * MỌI đường dẫn đều nâng cấp được, kể cả những đường ta chưa định nghĩa.
 *
 * Kiểm origin ở đây là bắt buộc và KHÔNG thừa: trình duyệt không áp CORS cho WebSocket,
 * nên một trang bất kỳ người dùng đang mở có thể nối tới ws://localhost và chạy query
 * trên database production của họ (security.md TM-4). Header CORS ở nhánh HTTP không
 * bảo vệ được đường này.
 */
const wsServers = new WeakMap<http.Server, WebSocketServer>()

function attachWebSocket(server: http.Server, origins: string[], authToken?: string): void {
  const wss = new WebSocketServer({ noServer: true })
  wsServers.set(server, wss)

  server.on('upgrade', (req, socket, head) => {
    const url = req.url ?? ''
    const pathname = url.split('?')[0]
    if (pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
      socket.destroy()
      return
    }

    // Origin vắng mặt = client không phải trình duyệt (CLI, test) — không có nguy cơ
    // "trang web lạ mượn phiên của người dùng", nên cho qua. Origin CÓ mà không nằm
    // trong allowlist thì đúng là kịch bản tấn công, từ chối.
    const origin = req.headers.origin
    if (origin !== undefined && !origins.includes(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }

    // Xác thực TRƯỚC khi nâng cấp: sau khi đã thành WebSocket thì không còn cách trả mã HTTP.
    if (authToken !== undefined && !tokenMatches(authToken, extractToken(req))) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      rpcServer.handleWebSocket(toWsConnection(ws))
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
  // Phải đóng WebSocket TRƯỚC: `server.close()` chỉ ngừng nhận kết nối mới rồi đợi các
  // kết nối đang mở kết thúc, mà WebSocket thì không tự kết thúc — không có bước này
  // thì shutdown treo vĩnh viễn khi còn một tab nào đó đang mở.
  const wss = server ? wsServers.get(server) : undefined
  if (wss) {
    for (const client of wss.clients) client.terminate()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
  }
  await new Promise<void>((resolve) => {
    if (!server) return resolve()
    server.close(() => resolve())
  })
  await engine.close()
}

if (isEntry) {
  const port = Number(process.env.CORVUS_PORT ?? 8080)
  const host = resolveHost()
  createWebServer(port, host).then((server) => {
    // In ĐÚNG địa chỉ đang bind. Dòng log cũ luôn in 127.0.0.1 trong khi server bind
    // 0.0.0.0 — sai lệch kiểu này làm người vận hành tưởng mình đang an toàn.
    // eslint-disable-next-line no-console -- entry point cua server, log khoi dong la dung
    console.log(
      `[corvus] RPC server dang lang nghe tai http://${host}:${port}/rpc ` +
        `va WebSocket tai ws://${host}:${port}/ws` +
        (process.env.CORVUS_AUTH_TOKEN ? ' (co xac thuc token)' : ' (loopback, khong token)'),
    )

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void shutdown(server).then(() => process.exit(0))
      })
    }
  })
}
