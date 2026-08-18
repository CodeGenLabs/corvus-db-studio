import * as crypto from 'node:crypto'

export interface ManagedAuthSession {
  sessionId: string
  userId: string
  role: string
  csrfToken: string
  createdAt: number
  expiresAt: number
}

export class SessionRotatorManager {
  private static sessions: Map<string, ManagedAuthSession> = new Map()
  private static SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000 // 8 hours

  public static createSession(userId: string, role: string): ManagedAuthSession {
    const sessionId = crypto.randomBytes(32).toString('hex')
    const csrfToken = crypto.randomBytes(24).toString('hex')
    const now = Date.now()

    const session: ManagedAuthSession = {
      sessionId,
      userId,
      role,
      csrfToken,
      createdAt: now,
      expiresAt: now + this.SESSION_LIFETIME_MS,
    }

    this.sessions.set(sessionId, session)
    return session
  }

  public static validateAndRotate(sessionId: string, csrfToken?: string): ManagedAuthSession | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId)
      return null
    }

    if (csrfToken && session.csrfToken !== csrfToken) {
      return null
    }

    return session
  }

  public static terminateSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }
}
