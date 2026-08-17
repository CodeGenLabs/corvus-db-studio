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
import { POSTGRES_CAPABILITIES } from './capabilities'

export class PostgresIntrospector implements Introspector {
  async listDatabases(): Promise<string[]> {
    return ['postgres', 'analytics', 'template1']
  }

  async listSchemas(_database?: string): Promise<string[]> {
    return ['public', 'information_schema', 'pg_catalog']
  }

  async listObjects(_opts: { database?: string; schema?: string; kind?: string }): Promise<
    Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>
  > {
    return [
      { name: 'users', kind: 'table', rows: '1,250', size: '128 kB', modified: '2026-08-10' },
      { name: 'orders', kind: 'table', rows: '45,800', size: '4.2 MB', modified: '2026-08-16' },
      { name: 'order_items', kind: 'table', rows: '120,400', size: '12 MB', modified: '2026-08-16' },
      { name: 'products', kind: 'table', rows: '3,400', size: '512 kB', modified: '2026-08-14' },
      { name: 'active_orders_view', kind: 'view', modified: '2026-08-01' },
      { name: 'monthly_sales_mv', kind: 'materializedView', size: '256 kB', modified: '2026-08-15' },
    ]
  }

  async getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta> {
    const table = opts.table || 'users'
    return {
      name: table,
      schema: opts.schema || 'public',
      columns: [
        { name: 'id', dataType: 'bigint', nullable: false, isPrimaryKey: true, ordinalPosition: 1 },
        { name: 'created_at', dataType: 'timestamptz', nullable: false, isPrimaryKey: false, ordinalPosition: 2 },
        { name: 'updated_at', dataType: 'timestamptz', nullable: false, isPrimaryKey: false, ordinalPosition: 3 },
      ],
      indexes: [
        { name: `${table}_pkey`, columns: ['id'], unique: true, primary: true },
      ],
      foreignKeys: [],
    }
  }

  async getDdl(opts: { database?: string; schema?: string; name: string; kind: string }): Promise<string> {
    const name = opts.name || 'users'
    return `CREATE TABLE "${opts.schema || 'public'}"."${name}" (\n  "id" BIGSERIAL PRIMARY KEY,\n  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);`
  }
}

export class PostgresConnection implements DriverConnection {
  readonly driverId = 'postgres' as const
  readonly serverVersion = { raw: 'PostgreSQL 16.2 on x86_64', major: 16, minor: 2, patch: 0 }
  readonly capabilities = POSTGRES_CAPABILITIES
  readonly introspect = new PostgresIntrospector()
  readonly dialect = 'postgres' as const

  async *execute(_req: ExecuteRequest): AsyncIterable<ResultChunk> {
    yield {
      seq: 0,
      columns: [
        { name: 'id', type: 'int8', align: 'r' },
        { name: 'status', type: 'varchar', align: 't' },
      ],
      rows: [
        [{ k: 'num', v: 1 }, { k: 'str', v: 'active' }],
        [{ k: 'num', v: 2 }, { k: 'str', v: 'pending' }],
      ],
      done: true,
      stats: { rowCount: 2, durationMs: 4 },
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
    return 8
  }

  async close(): Promise<void> {}
}

export class PostgresDriver implements DatabaseDriver {
  readonly id = 'postgres' as const
  readonly displayName = 'PostgreSQL'
  readonly capabilities = POSTGRES_CAPABILITIES
  readonly defaultPort = 5432

  async connect(_profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    return new PostgresConnection()
  }
}

export const postgresDriver = new PostgresDriver()
