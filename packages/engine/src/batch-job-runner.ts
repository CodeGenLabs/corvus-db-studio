export interface BatchStep {
  id: string
  name: string
  type: 'sql' | 'import' | 'export' | 'backup'
  payload: unknown
  continueOnError?: boolean
}

export interface BatchJobConfig {
  id: string
  name: string
  steps: BatchStep[]
}

export class EngineBatchJobRunner {
  private static activeJobs: Map<string, AbortController> = new Map()

  public static async runBatchJob(
    config: BatchJobConfig,
    stepExecutor: (step: BatchStep, signal: AbortSignal, log: (msg: string) => void) => Promise<{ success: boolean; error?: string }>,
    onLog?: (msg: string) => void,
  ): Promise<{ success: boolean; executedSteps: number; errors: string[] }> {
    const controller = new AbortController()
    this.activeJobs.set(config.id, controller)

    const errors: string[] = []
    let executedSteps = 0

    onLog?.(`[${new Date().toISOString()}] Starting Batch Job: ${config.name} (${config.steps.length} steps)`)

    try {
      for (const step of config.steps) {
        if (controller.signal.aborted) {
          onLog?.(`[${new Date().toISOString()}] Batch job was cancelled.`)
          break
        }

        onLog?.(`[${new Date().toISOString()}] Executing step: ${step.name} [${step.type}]`)
        executedSteps++

        const res = await stepExecutor(step, controller.signal, (msg) => onLog?.(`  └ ${msg}`))
        if (!res.success) {
          const err = `Step "${step.name}" failed: ${res.error}`
          errors.push(err)
          onLog?.(`[${new Date().toISOString()}] ❌ ${err}`)

          if (!step.continueOnError) {
            onLog?.(`[${new Date().toISOString()}] Halting batch job (continueOnError=false)`)
            return { success: false, executedSteps, errors }
          }
        } else {
          onLog?.(`[${new Date().toISOString()}] ✓ Step "${step.name}" completed successfully`)
        }
      }

      const overallSuccess = errors.length === 0
      onLog?.(`[${new Date().toISOString()}] Batch Job finished. Success: ${overallSuccess}`)
      return { success: overallSuccess, executedSteps, errors }
    } finally {
      this.activeJobs.delete(config.id)
    }
  }

  public static cancelBatchJob(jobId: string): boolean {
    const ctrl = this.activeJobs.get(jobId)
    if (!ctrl) return false
    ctrl.abort()
    this.activeJobs.delete(jobId)
    return true
  }
}
