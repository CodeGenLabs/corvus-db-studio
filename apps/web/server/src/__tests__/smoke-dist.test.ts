import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const distEntry = path.resolve(currentDir, '../../dist/index.js')

describe('T-B03 · Production Dist Smoke Test (apps/web/server/dist/index.js)', () => {
  beforeAll(() => {
    if (!fs.existsSync(distEntry)) {
      execSync('pnpm --filter @corvus/app-web-server build', {
        cwd: path.resolve(currentDir, '../../..'),
        stdio: 'inherit',
      })
    }
  })
  it('khởi động node dist/index.js, phục vụ /rpc và /ws, rồi shutdown sạch bằng SIGTERM', async () => {
    const port = 8200 + Math.floor(Math.random() * 500)
    const serverProc = spawn('node', [distEntry], {
      env: {
        ...process.env,
        CORVUS_PORT: String(port),
        CORVUS_MASTER_KEY: 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=', // 32 bytes base64
        CORVUS_AUTH_MODE: 'none',
        NODE_ENV: 'production',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    serverProc.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    serverProc.stderr?.on('data', (d) => {
      stdout += d.toString()
    })

    // Chờ server in log sẵn sàng
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Server không khởi động kịp sau 10s. Log: ${stdout}`))
      }, 10_000)

      const check = setInterval(() => {
        if (stdout.includes('RPC server dang lang nghe tai')) {
          clearTimeout(timeout)
          clearInterval(check)
          resolve()
        }
      }, 50)
    })

    // 1. Kiểm tra HTTP RPC POST
    const rpcRes = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${port}/rpc/connection.list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let body = ''
          res.on('data', (chunk) => {
            body += chunk
          })
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
        },
      )
      req.on('error', reject)
      req.write(JSON.stringify({}))
      req.end()
    })

    expect(rpcRes.status).toBe(200)
    const json = JSON.parse(rpcRes.body)
    expect(json).toBeDefined()

    // 2. Kiểm tra WebSocket bắt tay tại ws://127.0.0.1:port/ws
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`)
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve())
      ws.on('error', reject)
    })
    expect(ws.readyState).toBe(WebSocket.OPEN)
    ws.close()

    // 3. Kiểm tra SIGTERM shutdown sạch ≤ 5 s
    const t0 = Date.now()
    serverProc.kill('SIGTERM')

    const exitCode = await new Promise<number>((resolve) => {
      serverProc.on('exit', (code) => resolve(code ?? 0))
    })

    const elapsed = Date.now() - t0
    expect(exitCode).toBe(0)
    expect(elapsed).toBeLessThanOrEqual(5_000)
  }, 30_000)

  it('require better-sqlite3 hoạt động trong runtime Node', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3')
    const db = new Database(':memory:')
    const row = db.prepare('SELECT 1 + 1 AS r').get()
    expect(row).toEqual({ r: 2 })
    db.close()
  })
})
