export interface ChunkUploadSession {
  uploadId: string
  fileName: string
  totalSize: number
  chunkSize: number
  receivedChunks: number[]
  totalChunks: number
  tempFilePath?: string
  expiresAt: number
}

export class ChunkUploadManager {
  private static sessions: Map<string, ChunkUploadSession> = new Map()

  public static initSession(
    uploadId: string,
    fileName: string,
    totalSize: number,
    chunkSize: number = 1024 * 1024 * 5, // 5MB chunk default
  ): ChunkUploadSession {
    const totalChunks = Math.ceil(totalSize / chunkSize)
    const session: ChunkUploadSession = {
      uploadId,
      fileName,
      totalSize,
      chunkSize,
      receivedChunks: [],
      totalChunks,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
    }
    this.sessions.set(uploadId, session)
    return session
  }

  public static getSession(uploadId: string): ChunkUploadSession | undefined {
    const session = this.sessions.get(uploadId)
    if (!session) return undefined
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(uploadId)
      return undefined
    }
    return session
  }

  public static recordChunk(uploadId: string, chunkIndex: number): { completed: boolean; progress: number } {
    const session = this.getSession(uploadId)
    if (!session) throw new Error(`Upload session ${uploadId} not found`)

    if (!session.receivedChunks.includes(chunkIndex)) {
      session.receivedChunks.push(chunkIndex)
    }

    const progress = Math.round((session.receivedChunks.length / session.totalChunks) * 100)
    const completed = session.receivedChunks.length >= session.totalChunks

    return { completed, progress }
  }

  public static cleanupExpiredSessions(): void {
    const now = Date.now()
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id)
      }
    }
  }
}
