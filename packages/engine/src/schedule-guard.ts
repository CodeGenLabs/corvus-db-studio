export interface ScheduleTriggerDecision {
  shouldRun: boolean
  skipReason?: string
}

export class ScheduleTriggerGuard {
  private static runningJobs: Set<string> = new Set()

  /**
   * Prevents overlapping executions of the same recurring schedule
   */
  public static evaluateTrigger(jobId: string, jobName: string): ScheduleTriggerDecision {
    if (this.runningJobs.has(jobId)) {
      return {
        shouldRun: false,
        skipReason: `Bỏ qua kích hoạt lịch: Job "${jobName}" (${jobId}) vẫn đang chạy từ lần trước.`,
      }
    }

    this.runningJobs.add(jobId)
    return { shouldRun: true }
  }

  public static markJobCompleted(jobId: string): void {
    this.runningJobs.delete(jobId)
  }
}
