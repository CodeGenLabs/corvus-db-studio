import { EngineBatchJobRunner, type BatchJobConfig, type BatchStep } from './batch-job-runner'

export interface CliRunJobArgs {
  jobConfig: BatchJobConfig
  stepExecutor: (step: BatchStep, signal: AbortSignal, log: (msg: string) => void) => Promise<{ success: boolean; error?: string }>
}

export class CliJobExecutor {
  public static async runJobFromCli(args: CliRunJobArgs): Promise<{ exitCode: number; stdout: string[] }> {
    const stdout: string[] = []
    const log = (msg: string) => {
      stdout.push(msg)
      // eslint-disable-next-line no-console
      console.log(msg)
    }

    log(`[Corvus CLI] Executing Batch Job: ${args.jobConfig.name} (${args.jobConfig.id})`)

    const result = await EngineBatchJobRunner.runBatchJob(
      args.jobConfig,
      args.stepExecutor,
      log,
    )

    if (result.success) {
      log(`[Corvus CLI] SUCCESS: All ${result.executedSteps} steps completed.`)
      return { exitCode: 0, stdout }
    } else {
      log(`[Corvus CLI] FAILED: Encountered ${result.errors.length} error(s).`)
      for (const e of result.errors) {
        log(`  - ${e}`)
      }
      return { exitCode: 1, stdout }
    }
  }
}
