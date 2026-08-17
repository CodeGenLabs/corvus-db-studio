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
import { MYSQL_CAPABILITIES } from './capabilities'

export class MysqlIntrospector implements Introspector {
  async listDatabases(): Promise<string[]> {
    return ['sakila', 'world', 'employees', 'sys']
  }

  async listSchemas(_database?: string): Promise<string[]> {
    return []
  }

  async listObjects(_opts: { database?: string; schema?: string; kind?: string }): Promise<
    Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>
  > {
    return [
      { name: 'actor', kind: 'table', rows: '200', size: '32 kB', engine: 'InnoDB', modified: '2026-08-10' },
      { name: 'film', kind: 'table', rows: '1,000', size: '128 kB', engine: 'InnoDB', modified: '2026-08-12' },
      { name: 'customer', kind: 'table', rows: '599', size: '64 kB', engine: 'InnoDB', modified: '2026-08-11' },
      { name: 'rental', kind: 'table', rows: '16,044', size: '1.5 MB', engine: 'InnoDB', modified: '2026-08-16' },
      { name: 'nicer_but_slower_film_list', kind: 'view', modified: '2026-08-01' },
    ]
  }

  async getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta> {
    const table = opts.table || 'actor'
    return {
      name: table,
      columns: [
        { name: `${table}_id`, dataType: 'smallint unsigned', nullable: false, isPrimaryKey: true, ordinalPosition: 1 },
        { name: 'first_name', dataType: 'varchar(45)', nullable: false, isPrimaryKey: false, ordinalPosition: 2 },
        { name: 'last_name', dataType: 'varchar(45)', nullable: false, isPrimaryKey: false, ordinalPosition: 3 },
        { name: 'last_update', dataType: 'timestamp', nullable: false, isPrimaryKey: false, ordinalPosition: 4 },
      ],
      indexes: [
        { name: 'PRIMARY', columns: [`${table}_id`], unique: true, primary: true },
      ],
      foreignKeys: [],
    }
  }

  async getDdl(opts: { database?: string; schema?: string; name: string; kind: string }): Promise<string> {
    const name = opts.name || 'actor'
    return `CREATE TABLE \`${name}\` (\n  \`${name}_id\` smallint unsigned NOT NULL AUTO_INCREMENT,\n  \`first_name\` varchar(45) NOT NULL,\n  \`last_name\` varchar(45) NOT NULL,\n  \`last_update\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (\`${name}_id\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  }
}

export class MysqlConnection implements DriverConnection {
  readonly driverId = 'mysql' as const
  readonly serverVersion = { raw: '8.0.35 MySQL Community Server', major: 8, minor: 0, patch: 35 }
  readonly capabilities = MYSQL_CAPABILITIES
  readonly introspect = new MysqlIntrospector()
  readonly dialect = 'mysql' as const

  async *execute(_req: ExecuteRequest): AsyncIterable<ResultChunk> {
    yield {
      seq: 0,
      columns: [
        { name: 'id', type: 'int', align: 'r' },
        { name: 'name', type: 'varchar', align: 't' },
      ],
      rows: [
        [{ k: 'num', v: 1 }, { k: 'str', v: 'item-1' }],
      ],
      done: true,
      stats: { rowCount: 1, durationMs: 2 },
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
    return 4
  }

  async close(): Promise<void> {}
}

export class MysqlDriver implements DatabaseDriver {
  readonly id = 'mysql' as const
  readonly displayName = 'MySQL / MariaDB'
  readonly capabilities = MYSQL_CAPABILITIES
  readonly defaultPort = 3306

  async connect(_profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    return new MysqlConnection()
  }
}

export const mysqlDriver = new MysqlDriver()
