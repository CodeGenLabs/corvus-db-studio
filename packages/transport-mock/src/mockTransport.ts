import type {
  CallOptions,
  CapabilitySet,
  EventOf,
  TopicName,
  Transport,
  TransportStatus,
  Unsubscribe,
} from '@corvus/contract'
import {
  datasetFor,
  DB_USERS,
  fieldsFor,
  JOBS,
  RESULTS,
  TABLES,
} from './fixtures/sakila'

export const DEFAULT_MOCK_CAPABILITIES: CapabilitySet = {
  hierarchy: {
    hasCatalogs: true,
    hasSchemas: true,
  },
  objects: {
    table: true,
    view: true,
    materializedView: true,
    procedure: true,
    function: true,
    package: false,
    trigger: true,
    sequence: true,
    index: true,
    domain: true,
    type: true,
    event: false,
    collection: false,
    keyspace: false,
  },
  sql: {
    parameterStyle: 'question',
    identifierQuote: '`',
    limitSyntax: 'limit-offset',
    maxIdentifierLength: 64,
    caseSensitivity: 'lower',
    cte: true,
    windowFunctions: true,
    returning: false,
    upsert: 'on-duplicate-key',
  },
  exec: {
    streamingCursor: true,
    multipleStatements: true,
    multipleResultSets: true,
    cancelStatement: true,
    explain: true,
    explainAnalyze: true,
    preparedStatements: true,
  },
  tx: {
    supported: true,
    savepoints: true,
    ddlTransactional: false,
    isolationLevels: 4,
  },
  tools: {
    logicalBackup: true,
    physicalBackup: false,
    userManagement: true,
    roleManagement: true,
    processMonitor: true,
    serverVariables: true,
    dataGeneration: true,
    profiling: true,
  },
}

export interface MockTransportOptions {
  latencyMs?: number
}

export function createMockTransport(options: MockTransportOptions = {}): Transport {
  const latency = options.latencyMs ?? 10
  const listeners: Array<(status: TransportStatus) => void> = []
  const topicListeners = new Map<string, Set<(event: unknown) => void>>()
  const currentStatus: TransportStatus = 'ready'

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  return {
    get status() {
      return currentStatus
    },

    onStatusChange(cb: (s: TransportStatus) => void): Unsubscribe {
      listeners.push(cb)
      return () => {
        const idx = listeners.indexOf(cb)
        if (idx !== -1) listeners.splice(idx, 1)
      }
    },

    subscribe<T extends TopicName>(topic: T, handler: (event: EventOf<T>) => void): Unsubscribe {
      if (!topicListeners.has(topic)) {
        topicListeners.set(topic, new Set())
      }
      const set = topicListeners.get(topic)!
      const wrapped = handler as (event: unknown) => void
      set.add(wrapped)
      return () => {
        set.delete(wrapped)
      }
    },

    async request<TResult = unknown, TParams = unknown>(
      method: string,
      params: TParams,
      _opts?: CallOptions,
    ): Promise<TResult> {
      if (latency > 0) await sleep(latency)

      const p = (params ?? {}) as Record<string, unknown>

      switch (method) {
        case 'connection.list': {
          return [
            { id: '1', name: 'Local Dev', driverId: 'mysql', host: 'localhost', port: 3306, database: 'sakila', user: 'root' },
            { id: '2', name: 'Analytics', driverId: 'postgres', host: 'db.prod', port: 5432, database: 'analytics', user: 'app' },
            { id: '3', name: 'Reporting', driverId: 'mssql', host: 'mssql.prod', port: 1433, database: 'dw', user: 'sa' },
            { id: '4', name: 'Legacy ERP', driverId: 'oracle', host: 'ora.internal', port: 1521, database: 'ERPPROD', user: 'admin' },
            { id: '5', name: 'mobile.sqlite', driverId: 'sqlite', database: './mobile.sqlite' },
            { id: '6', name: 'Events', driverId: 'mongodb', host: 'mongo.internal', port: 27017, database: 'events' },
            { id: '7', name: 'Cache', driverId: 'redis', host: 'redis.internal', port: 6379, database: '0' },
          ] as TResult
        }

        case 'connection.test': {
          return { ok: true, version: '8.0.33-MySQL Community Server', latencyMs: 12 } as TResult
        }

        case 'connection.open': {
          return { sessionId: 'mock-session-123', capabilities: DEFAULT_MOCK_CAPABILITIES } as TResult
        }

        case 'connection.close': {
          return { success: true } as TResult
        }

        case 'connection.status': {
          return { status: 'connected', activeQueries: 0, poolSize: 5 } as TResult
        }

        case 'introspect.databases': {
          return ['sakila', 'world', 'employees'] as TResult
        }

        case 'introspect.schemas': {
          return ['public', 'staging'] as TResult
        }

        case 'introspect.objects': {
          return TABLES.map(([name, rows, size, engine, _autoinc, modified]) => ({
            name,
            kind: 'table',
            rows,
            size,
            engine,
            modified,
          })) as TResult
        }

        case 'introspect.tableMeta': {
          const tableName = (p.table as string) || 'actor'
          const fields = fieldsFor(tableName)
          return {
            name: tableName,
            columns: fields.map((f, i) => ({
              name: f.name,
              dataType: f.type,
              nullable: !f.notNull,
              isPrimaryKey: f.key === 'PK',
              ordinalPosition: i + 1,
            })),
            indexes: [{ name: 'PRIMARY', columns: [fields[0]?.name ?? 'id'], unique: true, primary: true }],
            foreignKeys: [],
          } as TResult
        }

        case 'introspect.ddl': {
          const tableName = (p.name as string) || 'actor'
          return {
            ddl: `CREATE TABLE \`${tableName}\` (\n  \`${tableName}_id\` smallint unsigned NOT NULL AUTO_INCREMENT,\n  \`last_update\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n  PRIMARY KEY (\`${tableName}_id\`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
          } as TResult
        }

        case 'introspect.identifiers': {
          return TABLES.map(([name]) => ({ name, kind: 'table' })) as TResult
        }

        case 'data.count': {
          const tableName = (p.table as string) || 'actor'
          const ds = datasetFor(tableName)
          return { count: parseInt(ds.total.replace(/,/g, ''), 10) || ds.rows.length, isEstimate: false } as TResult
        }

        case 'data.previewChanges': {
          return {
            sql: `-- Changes to ${p.table ?? 'table'}\nINSERT INTO \`${p.table ?? 'table'}\` VALUES (1, 'sample');`,
            previewToken: 'mock-preview-token-' + Date.now(),
            warnings: [],
          } as TResult
        }

        case 'data.applyChanges': {
          return { affectedRows: 1, success: true } as TResult
        }

        case 'query.explain': {
          return {
            format: 'tree',
            plan: { node: 'Seq Scan', cost: 10.5 },
            raw: 'Seq Scan on table (cost=0.00..10.50 rows=100 width=32)',
          } as TResult
        }

        case 'query.format': {
          return { sql: String(p.sql ?? '').trim() } as TResult
        }

        case 'query.cancel': {
          return { success: true } as TResult
        }

        case 'ddl.previewTable':
        case 'ddl.previewView':
        case 'ddl.previewRoutine':
        case 'ddl.dropObject': {
          return {
            sql: `-- DDL Preview for ${p.name ?? 'object'}\nALTER TABLE ...;`,
            previewToken: 'mock-ddl-token-' + Date.now(),
            warnings: [],
          } as TResult
        }

        case 'ddl.applyTable':
        case 'ddl.applyView':
        case 'ddl.applyRoutine': {
          return { success: true } as TResult
        }

        case 'tx.begin': {
          return { transactionId: 'tx-' + Date.now() } as TResult
        }
        case 'tx.commit':
        case 'tx.rollback': {
          return { success: true } as TResult
        }

        case 'job.list': {
          return JOBS.map(([name, , , , status], idx) => ({
            id: String(idx + 1),
            name,
            kind: 'batch' as const,
            status: status === 'ok' ? ('completed' as const) : status === 'running' ? ('running' as const) : ('failed' as const),
            createdAt: new Date().toISOString(),
          })) as TResult
        }

        case 'security.users': {
          return DB_USERS.map(([user, host, roles, status]) => ({
            user,
            host,
            roles: [roles],
            status,
          })) as TResult
        }

        case 'workspace.settings.get': {
          return {
            autoCommit: true,
            confirmDelete: true,
            sqlUpper: true,
            sslDefault: false,
            showLineNos: true,
            fontSize: 12.5,
            rowLimit: 1000,
            timeout: 30,
            keymap: 'default',
            aiModel: 'gpt-4o',
            autoUpdate: true,
            aiSchemaAccess: false,
            gridNull: 'highlight',
            startupView: 'objects',
            density: 'compact',
            mono: 'plex',
          } as TResult
        }

        case 'workspace.settings.set': {
          return { success: true } as TResult
        }

        default:
          return {} as TResult
      }
    },

    async *stream<TChunk = unknown, TParams = unknown>(
      method: string,
      params: TParams,
      _opts?: CallOptions,
    ): AsyncIterable<TChunk> {
      if (latency > 0) await sleep(latency)
      const p = (params ?? {}) as Record<string, unknown>

      switch (method) {
        case 'data.browse': {
          const tableName = (p.table as string) || 'country'
          const ds = datasetFor(tableName)
          yield {
            seq: 0,
            columns: ds.cols.map((name, i) => ({
              name,
              type: 'varchar',
              align: ds.align[i] ?? 't',
            })),
            rows: ds.rows,
            done: true,
            stats: { rowCount: ds.rows.length, durationMs: 15 },
          } as TChunk
          break
        }

        case 'query.execute': {
          yield {
            seq: 0,
            columns: [
              { name: 'Country', type: 'varchar', align: 't' },
              { name: 'Rentals', type: 'int', align: 'r' },
              { name: 'Customers', type: 'int', align: 'r' },
              { name: 'Revenue', type: 'decimal', align: 'r' },
            ],
            rows: RESULTS,
            done: true,
            stats: { rowCount: RESULTS.length, durationMs: 32 },
          } as TChunk
          break
        }

        case 'job.log': {
          yield {
            seq: 0,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Job started successfully',
            done: false,
          } as TChunk
          yield {
            seq: 1,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Processing batch 1 of 1',
            done: false,
          } as TChunk
          yield {
            seq: 2,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Job finished with code 0',
            done: true,
          } as TChunk
          break
        }

        default:
          yield { seq: 0, done: true, rows: [] } as TChunk
          break
      }
    },
  }
}
