import type { z } from 'zod'
import type {
  CapabilitySet,
  ConnectionProfile,
  DriverId,
  ResultChunk,
  TableMeta,
} from '@corvus/contract'
import type { SqlDialect } from '@corvus/sql'

export interface ServerVersion {
  raw: string
  major: number
  minor: number
  patch: number
}

export interface DriverContext {
  signal?: AbortSignal
  logger?: {
    debug(msg: string, extra?: Record<string, unknown>): void
    info(msg: string, extra?: Record<string, unknown>): void
    warn(msg: string, extra?: Record<string, unknown>): void
    error(msg: string, extra?: Record<string, unknown>): void
  }
}

export interface ResolvedProfile extends ConnectionProfile {
  password?: string
  sshTunnelReady?: boolean
  localProxyPort?: number
}

export interface ExecuteRequest {
  sql: string
  values?: unknown[]
  maxRows?: number
  chunkSize?: number
  signal?: AbortSignal
}

export interface StatementHandle {
  id: string
}

export interface TxOptions {
  readOnly?: boolean
  isolationLevel?: 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable'
}

export interface Transaction {
  readonly id: string
  commit(): Promise<void>
  rollback(): Promise<void>
  savepoint(name: string): Promise<void>
  rollbackTo(name: string): Promise<void>
}

export interface Introspector {
  listDatabases(): Promise<string[]>
  listSchemas(database?: string): Promise<string[]>
  listObjects(opts: { database?: string; schema?: string; kind?: string }): Promise<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>>
  getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta>
  getDdl(opts: { database?: string; schema?: string; name: string; kind: string }): Promise<string>
}

export interface DdlGenerator {
  generateCreateTable(meta: TableMeta): string
  generateAlterTable(diff: unknown): string
  generateDropTable(name: string): string
}

export interface DriverConnection {
  readonly driverId: DriverId
  readonly serverVersion: ServerVersion
  readonly capabilities: CapabilitySet
  readonly introspect: Introspector
  readonly dialect: SqlDialect
  readonly ddl?: DdlGenerator

  execute(req: ExecuteRequest): AsyncIterable<ResultChunk>
  beginTransaction(opts?: TxOptions): Promise<Transaction>
  cancel(handle: StatementHandle): Promise<void>
  extension?<T = unknown>(name: string): T | undefined
  ping(): Promise<number>
  close(): Promise<void>
}

export interface DatabaseDriver {
  readonly id: DriverId
  readonly displayName: string
  readonly capabilities: CapabilitySet
  readonly connectionSchema?: z.ZodType
  readonly defaultPort?: number

  connect(profile: ResolvedProfile, ctx?: DriverContext): Promise<DriverConnection>
}
