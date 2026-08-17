import type { DatabaseDriver, ResolvedProfile } from '@corvus/driver-core'
import type { ConnectionStateStatus, SessionInfo, StateListener } from './types'

export interface SessionManagerOptions {
  idleTimeoutMs?: number // Default: 10 mins (600,000 ms)
  heartbeatIntervalMs?: number // Default: 30s (30,000 ms)
  maxReconnectDelayMs?: number // Default: 30s (30,000 ms)
}

export class SessionManager {
  private readonly sessions = new Map<string, SessionInfo>()
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>()
  private readonly reconnectAttempts = new Map<string, number>()
  private readonly listeners = new Set<StateListener>()

  private readonly idleTimeoutMs: number
  private readonly heartbeatIntervalMs: number
  private readonly maxReconnectDelayMs: number
  private heartbeatTimer: NodeJS.Timeout | null = null

  constructor(options: SessionManagerOptions = {}) {
    this.idleTimeoutMs = options.idleTimeoutMs ?? 10 * 60 * 1000
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30 * 1000
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30 * 1000
  }

  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(connectionId: string, status: ConnectionStateStatus, error?: string): void {
    for (const listener of this.listeners) {
      listener(connectionId, status, error)
    }
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) return
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats()
    }, this.heartbeatIntervalMs)
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async checkHeartbeats(): Promise<void> {
    const now = Date.now()
    for (const [id, session] of this.sessions.entries()) {
      if (session.status !== 'connected') continue

      // Check idle timeout
      if (session.activeQueries === 0 && now - session.lastActiveAt > this.idleTimeoutMs) {
        await this.closeSession(id)
        continue
      }

      // Ping check
      try {
        await session.connection.ping()
      } catch (err) {
        session.status = 'reconnecting'
        this.notify(id, 'reconnecting', (err as Error).message)
      }
    }
  }

  async createSession(
    connectionId: string,
    driver: DatabaseDriver,
    profile: ResolvedProfile,
  ): Promise<SessionInfo> {
    const conn = await driver.connect(profile)
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const session: SessionInfo = {
      sessionId,
      connectionId,
      connection: conn,
      status: 'connected',
      lastActiveAt: Date.now(),
      activeQueries: 0,
    }

    this.sessions.set(connectionId, session)
    this.reconnectAttempts.set(connectionId, 0)
    this.notify(connectionId, 'connected')
    return session
  }

  getSession(connectionId: string): SessionInfo | undefined {
    return this.sessions.get(connectionId)
  }

  touchSession(connectionId: string): void {
    const session = this.sessions.get(connectionId)
    if (session) {
      session.lastActiveAt = Date.now()
    }
  }

  async closeSession(connectionId: string): Promise<void> {
    const timer = this.reconnectTimers.get(connectionId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(connectionId)
    }

    const session = this.sessions.get(connectionId)
    if (session) {
      try {
        await session.connection.close()
      } catch {
        // Ignore close errors
      }
      this.sessions.delete(connectionId)
      this.notify(connectionId, 'disconnected')
    }
  }

  scheduleReconnect(
    connectionId: string,
    driver: DatabaseDriver,
    profile: ResolvedProfile,
  ): void {
    const attempts = (this.reconnectAttempts.get(connectionId) ?? 0) + 1
    this.reconnectAttempts.set(connectionId, attempts)

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at maxReconnectDelayMs (30s)
    const delay = Math.min(1000 * Math.pow(2, attempts - 1), this.maxReconnectDelayMs)

    this.notify(connectionId, 'reconnecting')

    const timer = setTimeout(async () => {
      try {
        await this.createSession(connectionId, driver, profile)
      } catch {
        this.scheduleReconnect(connectionId, driver, profile)
      }
    }, delay)

    this.reconnectTimers.set(connectionId, timer)
  }

  async closeAll(): Promise<void> {
    this.stopHeartbeat()
    for (const id of Array.from(this.sessions.keys())) {
      await this.closeSession(id)
    }
  }
}
