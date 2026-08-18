export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes: string
  mandatory: boolean
}

export class UpdateCheckerManager {
  public static async checkForUpdates(hasRunningJobs: boolean): Promise<UpdateInfo | null> {
    // In actual app, queries the updates endpoint.
    // If jobs are running, do NOT trigger auto installation.
    if (hasRunningJobs) {
      return null
    }

    return null
  }
}
