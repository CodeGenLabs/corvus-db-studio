import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ConnectionProfile } from '@corvus/contract'
import type { SecretRef, SecretVault } from '@corvus/storage'
import { EngineRouter } from '../router'
import { SessionManager } from '../session'
import { registerHandlers, type ConnectionStore } from '../handlers'

let router: EngineRouter
let sessions: SessionManager
const tempTestFile = path.resolve(__dirname, '../../test_tmp_file.txt')

const profile: ConnectionProfile = {
  id: 'conn-wave3-test',
  name: 'Wave 3 Local Test',
  driverId: 'sqlite',
  database: ':memory:',
}

class MemoryVault implements SecretVault {
  async set(_ref: SecretRef, _value: string) {}
  async get(_ref: SecretRef) { return undefined }
  async delete(_ref: SecretRef) {}
}

const connections: ConnectionStore = {
  async list() { return [profile] },
  async get(id) { return id === profile.id ? profile : undefined },
}

beforeAll(() => {
  sessions = new SessionManager()
  router = new EngineRouter()
  registerHandlers(router, { sessions, connections, vault: new MemoryVault() })

  if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile)
})

afterAll(async () => {
  await sessions?.closeAll?.()
  if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile)
})

describe('Wave 3 · File I/O, AI Assistant, Job & Schedule RPC Handlers', () => {
  // ── file.* tests ──────────────────────────────────────────────────────────
  it('file.writeChunk + file.stat + file.readChunk: luồng ghi, kiểm tra và đọc file phân đoạn', async () => {
    // 1. Write chunk
    const testContent = 'Hello Corvus DB Studio!'
    const base64Data = Buffer.from(testContent, 'utf-8').toString('base64')

    const writeRes = (await router.handleRequest('file.writeChunk', {
      path: tempTestFile,
      offset: 0,
      data: base64Data,
    })) as { bytesWritten: number }

    expect(writeRes.bytesWritten).toBe(Buffer.byteLength(testContent))

    // 2. Stat
    const statRes = (await router.handleRequest('file.stat', {
      path: tempTestFile,
    })) as { sizeBytes: number; isFile: boolean; isDirectory: boolean }

    expect(statRes.isFile).toBe(true)
    expect(statRes.isDirectory).toBe(false)
    expect(statRes.sizeBytes).toBe(Buffer.byteLength(testContent))

    // 3. Read chunk
    const readRes = (await router.handleRequest('file.readChunk', {
      path: tempTestFile,
      offset: 0,
      length: 100,
    })) as { data: string; bytesRead: number; eof: boolean }

    expect(readRes.eof).toBe(true)
    expect(Buffer.from(readRes.data, 'base64').toString('utf-8')).toBe(testContent)

    // 4. Pick dialogs
    const openRes = (await router.handleRequest('file.pickOpen', {})) as { paths: string[] }
    expect(Array.isArray(openRes.paths)).toBe(true)

    const saveRes = (await router.handleRequest('file.pickSave', {
      defaultPath: '/tmp/test.sql',
    })) as { path: string | null }
    expect(saveRes.path).toBe('/tmp/test.sql')
  })

  // ── ai.* tests ────────────────────────────────────────────────────────────
  it('ai.generateSql + ai.fixSql + ai.explainPlan + ai.chat: các tiện ích AI', async () => {
    // 1. Generate SQL
    const genRes = (await router.handleRequest('ai.generateSql', {
      prompt: 'đếm số lượng bản ghi',
      dialect: 'postgres',
    })) as { sql: string; explanation?: string }

    expect(genRes.sql.toLowerCase()).toContain('count')

    // 2. Fix SQL
    const fixRes = (await router.handleRequest('ai.fixSql', {
      sql: 'SELECT 1',
      error: 'syntax error at end of input',
      dialect: 'postgres',
    })) as { fixedSql: string; explanation: string }

    expect(fixRes.fixedSql).toContain(';')

    // 3. Explain Plan
    const planRes = (await router.handleRequest('ai.explainPlan', {
      plan: 'Seq Scan on users',
      dialect: 'postgres',
    })) as { explanation: string; suggestions: string[] }

    expect(planRes.explanation).toBeTruthy()
    expect(planRes.suggestions.length).toBeGreaterThan(0)

    // 4. Chat stream
    const chatStream = router.handleStream('ai.chat', {
      messages: [{ role: 'user', content: 'Xin chào' }],
    })

    const deltas: string[] = []
    for await (const chunk of chatStream) {
      const c = chunk as { delta: string; done: boolean }
      deltas.push(c.delta)
    }
    expect(deltas.join('')).toContain('hỗ trợ')
  })

  // ── job.* & schedule.* tests ──────────────────────────────────────────────
  it('job.* & schedule.*: quản lý tác vụ nền và lịch định kỳ', async () => {
    // 1. Start Job
    const startRes = (await router.handleRequest('job.start', {
      kind: 'backup',
      name: 'Daily Backup',
      config: { target: 's3://backup' },
    })) as { jobId: string }

    expect(startRes.jobId).toMatch(/^job-/)

    // 2. Get Job
    const getRes = (await router.handleRequest('job.get', {
      id: startRes.jobId,
    })) as { id: string; status: string }

    expect(getRes.id).toBe(startRes.jobId)

    // 3. List Jobs
    const listRes = (await router.handleRequest('job.list', {})) as Array<{ id: string }>
    expect(listRes.some((j) => j.id === startRes.jobId)).toBe(true)

    // 4. Job Log Stream
    const logStream = router.handleStream('job.log', { id: startRes.jobId })
    const logs: unknown[] = []
    for await (const logChunk of logStream) {
      logs.push(logChunk)
    }
    expect(logs.length).toBeGreaterThan(0)

    // 5. Job Artifacts
    const artRes = (await router.handleRequest('job.artifacts', { id: startRes.jobId })) as Array<{ id: string }>
    expect(artRes.length).toBeGreaterThan(0)

    // 6. Schedule CRUD & runNow
    const schedCreate = (await router.handleRequest('schedule.create', {
      name: 'Midnight Backup',
      cronExpression: '0 0 * * *',
      jobKind: 'backup',
      jobConfig: {},
      enabled: true,
    })) as { id: string; name: string }

    expect(schedCreate.id).toMatch(/^sched-/)

    const schedList = (await router.handleRequest('schedule.list', {})) as Array<{ id: string }>
    expect(schedList.some((s) => s.id === schedCreate.id)).toBe(true)

    const runNowRes = (await router.handleRequest('schedule.runNow', {
      id: schedCreate.id,
    })) as { jobId: string }
    expect(runNowRes.jobId).toBeTruthy()

    const schedHistory = (await router.handleRequest('schedule.history', {
      scheduleId: schedCreate.id,
    })) as Array<{ id: string; status: string }>
    expect(schedHistory.length).toBeGreaterThan(0)

    const delRes = (await router.handleRequest('schedule.delete', {
      id: schedCreate.id,
    })) as { success: boolean }
    expect(delRes.success).toBe(true)
  })
})
