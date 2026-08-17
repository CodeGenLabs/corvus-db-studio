import type {
  DatabaseDriver,
  DriverConnection,
  DriverContext,
  ExecuteRequest,
  Introspector,
  ResolvedProfile,
  ResultChunk,
  StatementHandle,
  TableMeta,
  Transaction,
  TxOptions,
} from '@corvus/driver-core'
import { SQLITE_CAPABILITIES } from './capabilities'

export class SqliteIntrospector implements Introspector {
  async listDatabases(): Promise<string[]> {
    return ['main']
  }

  async listSchemas(_database?: string): Promise<string[]> {
    return []
  }

  async listObjects(_opts: { database?: string; schema?: string; kind?: string }): Promise<
    Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>
  > {
    return [
      { name: 'settings', kind: 'table', rows: '14', size: '4 kB', modified: '2026-08-17' },
      { name: 'connections', kind: 'table', rows: '7', size: '8 kB', modified: '2026-08-17' },
      { name: 'audit_log', kind: 'table', rows: '250', size: '64 kB', modified: '2026-08-17' },
    ]
  }

  async getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta> {
    const table = opts.table || 'settings'
    return {
      name: table,
      columns: [
        { name: 'key', dataType: 'TEXT', nullable: false, isPrimaryKey: true, ordinalPosition: 1 },
        { name: 'value', dataType: 'TEXT', nullable: false, isPrimaryKey: false, ordinalPosition: 2 },
      ],
      indexes: [
        { name: `sqlite_autoindex_${table}_1`, columns: ['key'], unique: true, primary: true },
      ],
      foreignKeys: [],
    }
  }

  async getDdl(opts: { database?: string; schema?: string; name: string; kind: string }): Promise<string> {
    const name = opts.name || 'settings'
    return `CREATE TABLE "${name}" (\n  "key" TEXT PRIMARY KEY,\n  "value" TEXT NOT NULL\n);`
  }
}

export class SqliteConnection implements DriverConnection {
  readonly driverId = 'sqlite' as const
  readonly serverVersion = { raw: '3.45.1', major: 3, minor: 45, patch: 1 }
  readonly capabilities = SQLITE_CAPABILITIES
  readonly introspect = new SqliteIntrospector()
  readonly dialect = 'sqlite' as const

  async *execute(_req: ExecuteRequest): AsyncIterable<ResultChunk> {
    yield {
      seq: 0,
      columns: [
        { name: 'key', type: 'text', align: 't' },
        { name: 'value', type: 'text', align: 't' },
      ],
      rows: [
        [{ k: 'str', v: 'theme' }, { k: 'str', v: 'light' }],
      ],
      done: true,
      stats: { rowCount: 1, durationMs: 1 },
    }
  }

  async beginTransaction(_opts?: TxOptions): Promise<Transaction> {
    return {
      id: `tx-${Date.now()}`,
      commit: async () => {},
      rollback: async () => {},
      savepoint: async (_name: string) => {},
      rollbackTo: async (_name: string) => {},
    }
  }

  async cancel(_handle: StatementHandle): Promise<void> {}

  async ping(): Promise<number> {
    return 1
  }

  async close(): Promise<void> {}
}

export class SqliteDriver implements DatabaseDriver {
  readonly id = 'sqlite' as const
  readonly displayName = 'SQLite'
  readonly capabilities = SQLITE_CAPABILITIES

  async connect(_profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    return new SqliteConnection()
  }
}

export const sqliteDriver = new SqliteDriver()
