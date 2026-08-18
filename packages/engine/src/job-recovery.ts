export interface PersistedJobRecord {
  id: string
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'INTERRUPTED'
  startedAt?: string
  endedAt?: string
  errorMessage?: string
}

export class JobRecoveryManager {
  /**
   * On engine startup, scans running/queued jobs from previous session and marks them INTERRUPTED
   */
  public static recoverDanglingJobs(jobs: PersistedJobRecord[]): PersistedJobRecord[] {
    const now = new Date().toISOString()
    return jobs.map((job) => {
      if (job.status === 'RUNNING' || job.status === 'QUEUED') {
        return {
          ...job,
          status: 'INTERRUPTED',
          endedAt: now,
          errorMessage: 'Job was interrupted due to application restart / crash.',
        }
      }
      return job
    })
  }
}
