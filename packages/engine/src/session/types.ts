import type { DriverConnection } from '@corvus/driver-core'

export type ConnectionStateStatus = 'connected' | 'reconnecting' | 'disconnected'

export interface SessionInfo {
  sessionId: string
  connectionId: string
  connection: DriverConnection
  status: ConnectionStateStatus
  lastActiveAt: number
  activeQueries: number
}

export type StateListener = (connectionId: string, status: ConnectionStateStatus, error?: string) => void
