import http from 'node:http'
import { HttpRpcServer } from '@corvus/transport-http/server'

// Mock router until @corvus/engine is linked in T-018
const mockRouter = {
  async handleRequest(method: string, params: unknown) {
    return { ok: true, method, params }
  },
  async *handleStream(method: string, params: unknown) {
    yield { seq: 0, method, params, done: true }
  },
}

export const rpcServer = new HttpRpcServer(mockRouter)

export function createWebServer(port = 8080) {
  const server = http.createServer(async (req, res) => {
    // CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id')

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
