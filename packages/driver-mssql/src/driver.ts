import mssql from 'mssql'
import type {
  CapabilitySet,
  ColumnDef,
  ResultChunk,
} from '@corvus/contract'
import { corvusError } from '@corvus/contract'
import type {
  DatabaseDriver,
  DriverConnection,
  DriverContext,
  ExecuteRequest,
  Introspector,
  ResolvedProfile,
  ServerVersion,
  StatementHandle,
  Transaction,
  TxOptions,
} from '@corvus/driver-core'
import { MSSQL_CAPABILITIES, narrowMssqlCapabilities } from './capabilities'
import { toCorvusError } from './errors'
import { MssqlIntrospector } from './introspect'
import { toCellValue } from './value'

const DEFAULT_CHUNK_SIZE = 100

function parseMssqlServerVersion(versionString: string): ServerVersion {
  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(versionString)
  return {
    raw: versionString,
    major: match ? parseInt(match[1] ?? '0', 10) : 0,
    minor: match ? parseInt(match[2] ?? '0', 10) : 0,
    patch: match && match[3] ? parseInt(match[3], 10) : 0,
  }
}

export class MssqlTransaction implements Transaction {
  constructor(
    readonly id: string,
    private readonly tx: mssql.Transaction,
  ) {}

  async commit(): Promise<void> {
    await this.tx.commit()
  }

  async rollback(): Promise<void> {
    await this.tx.rollback()
  }

  async savepoint(name: string): Promise<void> {
    const req = this.tx.request()
    await req.query(`SAVE TRANSACTION [${name}]`)
  }

  async rollbackTo(name: string): Promise<void> {
    const req = this.tx.request()
    await req.query(`ROLLBACK TRANSACTION [${name}]`)
  }
}

export class MssqlConnection implements DriverConnection {
  readonly driverId = 'mssql' as const
  readonly dialect = 'mssql' as const
  readonly introspect: Introspector
  private closed = false
  private readonly running = new Map<string, mssql.Request>()

  constructor(
    private readonly pool: mssql.ConnectionPool,
    readonly serverVersion: ServerVersion,
    readonly capabilities: CapabilitySet,
  ) {
    this.introspect = new MssqlIntrospector(pool)
  }

  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) throw corvusError('CONNECTION_FAILED', 'Kết nối đã đóng')

    const chunkSize = Math.max(1, req.chunkSize ?? DEFAULT_CHUNK_SIZE)
    const handleId = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const request = this.pool.request()
    request.stream = true

    this.running.set(handleId, request)

    let seq = 0
    let emitted = 0
    let columns: ColumnDef[] | undefined
    let abortListener: (() => void) | undefined
    const startedAt = Date.now()

    if (req.signal) {
      if (req.signal.aborted) throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
      abortListener = () => {
        void this.cancel({ id: handleId }).catch(() => {
          // ignore
        })
      }
      req.signal.addEventListener('abort', abortListener, { once: true })
    }

    // Bind parameters: @p1, @p2, ...
    if (req.values && Array.isArray(req.values)) {
      req.values.forEach((val: unknown, idx: number) => {
        request.input(`p${idx + 1}`, val)
      })
    }

    interface StreamEvent {
      type: 'columns' | 'row' | 'done' | 'error'
      columns?: ColumnDef[]
      row?: unknown[]
      rowsAffected?: number
      error?: unknown
    }

    const queue: StreamEvent[] = []
    let notifyQueue: (() => void) | null = null
    let streamEnded = false

    const pushEvent = (evt: StreamEvent) => {
      queue.push(evt)
      if (notifyQueue) {
        notifyQueue()
        notifyQueue = null
      }
    }

    request.on('recordset', (recordsetColumns: Record<string, { name: string; type: () => { name: string } }>) => {
      const colDefs: ColumnDef[] = Object.keys(recordsetColumns).map((name) => ({
        name,
        type: typeof recordsetColumns[name]?.type === 'function'
          ? recordsetColumns[name]?.type()?.name ?? 'nvarchar'
          : 'nvarchar',
        nullable: true,
      }))
      pushEvent({ type: 'columns', columns: colDefs })
    })

    request.on('row', (rowObj: Record<string, unknown>) => {
      const rowValues = columns
        ? columns.map((c) => rowObj[c.name])
        : Object.values(rowObj)

      pushEvent({ type: 'row', row: rowValues })
      if (queue.length > chunkSize * 3) {
        request.pause()
      }
    })

    request.on('done', (result: { rowsAffected?: number[] }) => {
      streamEnded = true
      const affected = result?.rowsAffected?.reduce((a, b) => a + b, 0) ?? 0
      pushEvent({ type: 'done', rowsAffected: affected })
    })

    request.on('error', (err: unknown) => {
      streamEnded = true
      pushEvent({ type: 'error', error: err })
    })

    void request.query(req.sql).catch((err) => {
      if (!streamEnded) {
        streamEnded = true
        pushEvent({ type: 'error', error: err })
      }
    })

    let currentChunkRows: Array<ReturnType<typeof toCellValue>[]> = []

    try {
      while (!streamEnded || queue.length > 0) {
        if (req.signal?.aborted) {
          throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        }

        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            notifyQueue = resolve
          })
          continue
        }

        const evt = queue.shift()
        if (!evt) continue

        if (evt.type === 'error') {
          throw toCorvusError(evt.error)
        }

        if (evt.type === 'columns' && evt.columns) {
          columns = evt.columns
        }

        if (evt.type === 'row' && evt.row) {
          const formattedRow = evt.row.map((val, idx) => {
            const colType = columns?.[idx]?.type
            return toCellValue(val, colType)
          })
          currentChunkRows.push(formattedRow)
          emitted++

          if (queue.length <= chunkSize) {
            request.resume()
          }

          if (currentChunkRows.length >= chunkSize || (req.maxRows !== undefined && emitted >= req.maxRows)) {
            yield {
              seq: seq++,
              columns,
              rows: currentChunkRows,
              done: req.maxRows !== undefined && emitted >= req.maxRows,
            }
            currentChunkRows = []

            if (req.maxRows !== undefined && emitted >= req.maxRows) {
              request.cancel()
              break
            }
          }
        }

        if (evt.type === 'done') {
          yield {
            seq: seq++,
            columns,
            rows: currentChunkRows,
            done: true,
            stats: {
              rowCount: emitted,
              durationMs: Date.now() - startedAt,
              truncated: false,
            },
          }
          currentChunkRows = []
          break
        }
      }
    } finally {
      if (abortListener && req.signal) {
        req.signal.removeEventListener('abort', abortListener)
      }
      this.running.delete(handleId)
    }
  }

  async beginTransaction(opts?: TxOptions): Promise<Transaction> {
    const tx = this.pool.transaction()
    const isoLevel =
      opts?.isolationLevel === 'serializable'
        ? mssql.ISOLATION_LEVEL.SERIALIZABLE
        : opts?.isolationLevel === 'repeatable-read'
          ? mssql.ISOLATION_LEVEL.REPEATABLE_READ
          : opts?.isolationLevel === 'read-uncommitted'
            ? mssql.ISOLATION_LEVEL.READ_UNCOMMITTED
            : mssql.ISOLATION_LEVEL.READ_COMMITTED

    await tx.begin(isoLevel)
    return new MssqlTransaction(`tx-${Date.now()}`, tx)
  }

  async cancel(handle: StatementHandle): Promise<void> {
    const request = this.running.get(handle.id)
    if (!request) return
    try {
      request.cancel()
    } catch {
      // ignore
    }
  }

  async ping(): Promise<number> {
    const t0 = Date.now()
    await this.pool.request().query('SELECT 1')
    return Date.now() - t0
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.pool.close()
  }
}

export class MssqlDriver implements DatabaseDriver {
  readonly id = 'mssql' as const
  readonly displayName = 'SQL Server'
  readonly capabilities = MSSQL_CAPABILITIES
  readonly defaultPort = 1433

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    const port = profile.port ?? 1433
    const isLocal = profile.host === 'localhost' || profile.host === '127.0.0.1'

    const config: mssql.config = {
      server: profile.host ?? 'localhost',
      port,
      database: profile.database ?? 'master',
      user: profile.user ?? 'sa',
      password: profile.password ?? '',
      options: {
        encrypt: profile.ssl ? profile.ssl.mode !== 'disable' : !isLocal,
        trustServerCertificate: profile.ssl ? profile.ssl.mode === 'require' : isLocal,
        connectTimeout: 15_000,
        requestTimeout: 30_000,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30_000,
      },
    }

    try {
      const pool = new mssql.ConnectionPool(config)
      await pool.connect()

      let versionString = ''
      try {
        const verRes = await pool.request().query<{ version: string }>('SELECT @@VERSION AS version')
        versionString = verRes.recordset[0]?.version ?? ''
      } catch {
        // ignore
      }

      const serverVersion = parseMssqlServerVersion(versionString)
      const capabilities = narrowMssqlCapabilities(versionString)
      return new MssqlConnection(pool, serverVersion, capabilities)
    } catch (err) {
      throw toCorvusError(err)
    }
  }
}

export const mssqlDriver = new MssqlDriver()
