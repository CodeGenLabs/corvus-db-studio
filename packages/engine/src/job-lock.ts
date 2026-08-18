export class JobTargetLockManager {
  // Key: `connectionId:schema:table`, Value: jobId
  private static locks: Map<string, string> = new Map()

  private static getLockKey(connectionId: string, schema: string, table: string): string {
    return `${connectionId}:${schema}:${table}`
  }

  public static acquireLock(jobId: string, connectionId: string, schema: string, table: string): boolean {
    const key = this.getLockKey(connectionId, schema, table)
    const existing = this.locks.get(key)
    if (existing && existing !== jobId) {
      return false // Locked by another job
    }
    this.locks.set(key, jobId)
    return true
  }

  public static releaseLock(jobId: string, connectionId: string, schema: string, table: string): void {
    const key = this.getLockKey(connectionId, schema, table)
    if (this.locks.get(key) === jobId) {
      this.locks.delete(key)
    }
  }

  public static releaseAllJobLocks(jobId: string): void {
    for (const [key, id] of this.locks.entries()) {
      if (id === jobId) {
        this.locks.delete(key)
      }
    }
  }
}
