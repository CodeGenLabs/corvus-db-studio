import { JobTargetLockManager } from './job-lock'

export interface EngineJobSpec {
  id: string
  name: string
  connectionId: string
  targetSchema?: string
  targetTable?: string
  totalUnits?: number
  onProgress?: (progress: number, message: string) => void
  onLog?: (line: string) => void
}

export class EngineJobRunner {
  private static activeJobs: Map<string, { abortController: AbortController }> = new Map()

  public static async executeJob(
    spec: EngineJobSpec,
    taskFn: (signal: AbortSignal, updateProgress: (current: number, msg?: string) => void, log: (msg: string) => void) => Promise<void>,
  ): Promise<{ success: boolean; error?: string }> {
    if (spec.targetSchema && spec.targetTable) {
      const locked = JobTargetLockManager.acquireLock(spec.id, spec.connectionId, spec.targetSchema, spec.targetTable)
      if (!locked) {
        throw new Error(`Cannot start job: table ${spec.targetSchema}.${spec.targetTable} is already locked by another running job.`)
      }
    }

    const abortController = new AbortController()
    this.activeJobs.set(spec.id, { abortController })

    try {
      spec.onLog?.(`[${new Date().toISOString()}] Starting job ${spec.name} (${spec.id})`)

      await taskFn(
        abortController.signal,
        (current, msg) => {
          const total = spec.totalUnits || 100
          const pct = Math.min(100, Math.round((current / total) * 100))
          spec.onProgress?.(pct, msg || `Processing: ${pct}%`)
        },
        (msg) => {
          spec.onLog?.(`[${new Date().toISOString()}] ${msg}`)
        },
      )

      spec.onLog?.(`[${new Date().toISOString()}] Job completed successfully.`)
      return { success: true }
    } catch (err: any) {
      if (abortController.signal.aborted) {
        spec.onLog?.(`[${new Date().toISOString()}] Job was cancelled by user.`)
        return { success: false, error: 'Job was cancelled by user.' }
      }
      spec.onLog?.(`[${new Date().toISOString()}] Job failed with error: ${err.message}`)
      return { success: false, error: err.message }
    } finally {
      this.activeJobs.delete(spec.id)
      if (spec.targetSchema && spec.targetTable) {
        JobTargetLockManager.releaseLock(spec.id, spec.connectionId, spec.targetSchema, spec.targetTable)
      }
    }
  }

  public static cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (!job) return false
    job.abortController.abort()
    this.activeJobs.delete(jobId)
    JobTargetLockManager.releaseAllJobLocks(jobId)
    return true
  }

  public static isJobRunning(jobId: string): boolean {
    return this.activeJobs.has(jobId)
  }
}
