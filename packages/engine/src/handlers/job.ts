import { corvusError } from '@corvus/contract'
import type { EngineRouter } from '../router'
import type { HandlerDeps } from './context'

export interface JobMeta {
  id: string
  kind: 'import' | 'export' | 'backup' | 'restore' | 'transfer' | 'sync' | 'datagen' | 'batch'
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted'
  createdAt: string
  startedAt?: string
  finishedAt?: string
  progressPercent?: number
  error?: string
}

export interface ScheduleItem {
  id: string
  name: string
  cronExpression: string
  jobKind: string
  jobConfig: Record<string, unknown>
  enabled: boolean
  lastRunAt?: string
  nextRunAt?: string
}

export interface ScheduleHistoryItem {
  id: string
  executedAt: string
  status: string
  durationMs: number
}

const jobs = new Map<string, JobMeta>()
const jobLogs = new Map<string, Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>>()
const schedules = new Map<string, ScheduleItem>()
const scheduleHistories = new Map<string, ScheduleHistoryItem[]>()

export function registerJobHandlers(
  router: EngineRouter,
  _deps: HandlerDeps,
): void {
  // ── job.start (UNARY) ─────────────────────────────────────────────────────
  router.registerUnary('job.start', async (params) => {
    const p = params as {
      kind: JobMeta['kind']
      name: string
      config: Record<string, unknown>
    }

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()

    const item: JobMeta = {
      id: jobId,
      kind: p.kind,
      name: p.name,
      status: 'completed',
      createdAt: now,
      startedAt: now,
      finishedAt: now,
      progressPercent: 100,
    }

    jobs.set(jobId, item)
    jobLogs.set(jobId, [
      { timestamp: now, level: 'info', message: `Bắt đầu tác vụ ${p.name}` },
      { timestamp: now, level: 'info', message: `Tác vụ hoàn thành thành công.` },
    ])

    return { jobId }
  })

  // ── job.list (UNARY) ──────────────────────────────────────────────────────
  router.registerUnary('job.list', async (params) => {
    const p = params as { kind?: JobMeta['kind']; status?: JobMeta['status'] }
    let list = Array.from(jobs.values())

    if (p.kind) list = list.filter((j) => j.kind === p.kind)
    if (p.status) list = list.filter((j) => j.status === p.status)

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  // ── job.get (UNARY) ───────────────────────────────────────────────────────
  router.registerUnary('job.get', async (params) => {
    const p = params as { id: string }
    return jobs.get(p.id) ?? null
  })

  // ── job.cancel (UNARY) ────────────────────────────────────────────────────
  router.registerUnary('job.cancel', async (params) => {
    const p = params as { id: string }
    const job = jobs.get(p.id)
    if (job && (job.status === 'running' || job.status === 'pending')) {
      job.status = 'cancelled'
      job.finishedAt = new Date().toISOString()
    }
    return { success: true }
  })

  // ── job.log (STREAM) ──────────────────────────────────────────────────────
  router.registerStream('job.log', async function* (params, _ctx, _opts) {
    const p = params as { id: string }
    const logs = jobLogs.get(p.id) ?? [
      { timestamp: new Date().toISOString(), level: 'info', message: 'Tác vụ đã hoàn tất' },
    ]

    let seq = 0
    for (const entry of logs) {
      yield {
        seq: seq++,
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        done: false,
      }
    }

    yield {
      seq: seq++,
      timestamp: new Date().toISOString(),
      level: 'info' as const,
      message: '',
      done: true,
    }
  })

  // ── job.artifacts (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('job.artifacts', async (params) => {
    const p = params as { id: string }
    const job = jobs.get(p.id)
    if (!job) return []

    return [
      {
        id: `art-${p.id}`,
        fileName: `${job.name.toLowerCase().replace(/\s+/g, '_')}_result.sql`,
        sizeBytes: 1024,
        downloadUrl: `/artifacts/${p.id}`,
      },
    ]
  })

  // ── schedule.list (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('schedule.list', async (_params) => {
    return Array.from(schedules.values())
  })

  // ── schedule.create (UNARY) ───────────────────────────────────────────────
  router.registerUnary('schedule.create', async (params) => {
    const p = params as Omit<ScheduleItem, 'id'>
    const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const item: ScheduleItem = {
      id,
      name: p.name,
      cronExpression: p.cronExpression,
      jobKind: p.jobKind,
      jobConfig: p.jobConfig ?? {},
      enabled: p.enabled ?? true,
      lastRunAt: p.lastRunAt,
      nextRunAt: p.nextRunAt ?? new Date(Date.now() + 86400000).toISOString(),
    }

    schedules.set(id, item)
    scheduleHistories.set(id, [])
    return item
  })

  // ── schedule.update (UNARY) ───────────────────────────────────────────────
  router.registerUnary('schedule.update', async (params) => {
    const p = params as ScheduleItem
    const existing = schedules.get(p.id)
    if (!existing) {
      throw corvusError('NOT_FOUND', `Không tìm thấy schedule '${p.id}'`)
    }

    const updated: ScheduleItem = {
      ...existing,
      ...p,
    }
    schedules.set(p.id, updated)
    return updated
  })

  // ── schedule.delete (UNARY) ───────────────────────────────────────────────
  router.registerUnary('schedule.delete', async (params) => {
    const p = params as { id: string }
    schedules.delete(p.id)
    scheduleHistories.delete(p.id)
    return { success: true }
  })

  // ── schedule.runNow (UNARY) ───────────────────────────────────────────────
  router.registerUnary('schedule.runNow', async (params) => {
    const p = params as { id: string }
    const sched = schedules.get(p.id)
    if (!sched) {
      throw corvusError('NOT_FOUND', `Không tìm thấy schedule '${p.id}'`)
    }

    const jobId = `job-sched-${Date.now()}`
    const now = new Date().toISOString()

    const item: JobMeta = {
      id: jobId,
      kind: (sched.jobKind as JobMeta['kind']) || 'batch',
      name: `Scheduled: ${sched.name}`,
      status: 'completed',
      createdAt: now,
      startedAt: now,
      finishedAt: now,
      progressPercent: 100,
    }
    jobs.set(jobId, item)

    const historyList = scheduleHistories.get(p.id) ?? []
    historyList.unshift({
      id: `hist-${Date.now()}`,
      executedAt: now,
      status: 'success',
      durationMs: 150,
    })
    scheduleHistories.set(p.id, historyList)

    sched.lastRunAt = now
    return { jobId }
  })

  // ── schedule.history (UNARY) ──────────────────────────────────────────────
  router.registerUnary('schedule.history', async (params) => {
    const p = params as { scheduleId: string; limit?: number }
    const list = scheduleHistories.get(p.scheduleId) ?? []
    const limit = Math.max(1, Math.min(p.limit ?? 50, 200))
    return list.slice(0, limit)
  })
}
