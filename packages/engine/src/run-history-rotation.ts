export interface JobRunHistoryItem {
  id: string
  jobId: string
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'INTERRUPTED'
  startedAt: string
  endedAt?: string
  logSize?: number
}

export class RunHistoryRotationManager {
  /**
   * Trims historical run logs keeping up to `maxKeep` entries per job
   */
  public static rotateRuns(
    history: JobRunHistoryItem[],
    maxKeep: number = 100,
    maxAgeDays: number = 30,
  ): JobRunHistoryItem[] {
    const cutoffDate = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000

    // Group by jobId
    const byJob: Record<string, JobRunHistoryItem[]> = {}
    for (const item of history) {
      const list = byJob[item.jobId] ?? []
      list.push(item)
      byJob[item.jobId] = list
    }

    const retained: JobRunHistoryItem[] = []
    for (const list of Object.values(byJob)) {
      // Sort newest first
      const sorted = [...list].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )

      // Filter by maxAge and slice maxKeep
      const kept = sorted
        .filter((item) => new Date(item.startedAt).getTime() >= cutoffDate)
        .slice(0, maxKeep)

      retained.push(...kept)
    }

    return retained.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
  }
}
