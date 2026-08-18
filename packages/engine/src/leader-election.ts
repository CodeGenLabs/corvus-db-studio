export interface ScheduleLockRecord {
  lockKey: string
  instanceId: string
  acquiredAt: number
  expiresAt: number
}

export class LeaderElectionManager {
  private static locks: Map<string, ScheduleLockRecord> = new Map()

  /**
   * Attempts to acquire leader lease for a scheduled job across cluster instances
   */
  public static tryAcquireLeaderLease(
    jobId: string,
    instanceId: string,
    ttlSeconds: number = 60,
  ): boolean {
    const now = Date.now()
    const existing = this.locks.get(jobId)

    if (existing && existing.expiresAt > now && existing.instanceId !== instanceId) {
      return false // Another instance holds the lease
    }

    this.locks.set(jobId, {
      lockKey: jobId,
      instanceId,
      acquiredAt: now,
      expiresAt: now + ttlSeconds * 1000,
    })

    return true
  }

  public static releaseLeaderLease(jobId: string, instanceId: string): void {
    const existing = this.locks.get(jobId)
    if (existing && existing.instanceId === instanceId) {
      this.locks.delete(jobId)
    }
  }

  public static isLeader(jobId: string, instanceId: string): boolean {
    const existing = this.locks.get(jobId)
    if (!existing) return false
    return existing.instanceId === instanceId && existing.expiresAt > Date.now()
  }
}
