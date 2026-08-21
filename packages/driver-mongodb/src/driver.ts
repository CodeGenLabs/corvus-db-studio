import { MongoClient } from 'mongodb'
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
import { MONGO_CAPABILITIES } from './capabilities'
import { toCorvusError } from './errors'
import { MongoIntrospector } from './introspect'
import { toCellValue } from './value'

const DEFAULT_CHUNK_SIZE = 100

function parseMongoServerVersion(versionString: string): ServerVersion {
  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(versionString)
  return {
    raw: versionString,
    major: match ? parseInt(match[1] ?? '0', 10) : 0,
    minor: match ? parseInt(match[2] ?? '0', 10) : 0,
    patch: match && match[3] ? parseInt(match[3], 10) : 0,
  }
}

export class MongoConnection implements DriverConnection {
  readonly driverId = 'mongodb' as const
  readonly introspect: Introspector
  private closed = false
  private readonly running = new Map<string, () => Promise<void>>()

  constructor(
    private readonly client: MongoClient,
    readonly serverVersion: ServerVersion,
    readonly capabilities: CapabilitySet,
    private readonly defaultDb: string = 'test',
  ) {
    this.introspect = new MongoIntrospector(client)
  }

  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) throw corvusError('CONNECTION_FAILED', 'Kết nối đã đóng')

    const chunkSize = Math.max(1, req.chunkSize ?? DEFAULT_CHUNK_SIZE)
    const handleId = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()

    let seq = 0
    let emitted = 0
    let columns: ColumnDef[] | undefined
    let abortListener: (() => void) | undefined

    try {
      const db = this.client.db(this.defaultDb)
      const rawCommand = req.command ?? req.sql ?? '{}'
      let parsed: Record<string, unknown> = {}

      if (typeof rawCommand === 'string') {
        try {
          parsed = JSON.parse(rawCommand) as Record<string, unknown>
        } catch {
          // If plain text query, default to find on collection or command
          parsed = { command: rawCommand }
        }
      } else {
        parsed = rawCommand
      }

      const collectionName = (parsed.collection as string) ?? (parsed.find as string) ?? 'test'
      const filter = (parsed.filter as Record<string, unknown>) ?? {}
      const projection = parsed.projection as Record<string, unknown> | undefined
      const sort = parsed.sort as Record<string, 1 | -1> | undefined

      const cursor = db.collection(collectionName).find(filter, { projection, sort })

      this.running.set(handleId, async () => {
        await cursor.close()
      })

      if (req.signal) {
        if (req.signal.aborted) {
          await cursor.close()
          throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        }
        abortListener = () => {
          void this.cancel({ id: handleId })
        }
        req.signal.addEventListener('abort', abortListener, { once: true })
      }

      let currentBatch: Array<ReturnType<typeof toCellValue>[]> = []
      const knownColumns = new Set<string>(['_id'])

      for await (const doc of cursor) {
        if (req.signal?.aborted) {
          throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        }

        // Dynamically track column schema from fields
        for (const key of Object.keys(doc)) {
          knownColumns.add(key)
        }

        if (!columns || columns.length !== knownColumns.size) {
          columns = Array.from(knownColumns).map((name) => ({
            name,
            type: 'bson',
            nullable: true,
          }))
        }

        const row = columns.map((col) => toCellValue(doc[col.name]))
        currentBatch.push(row)
        emitted++

        if (currentBatch.length >= chunkSize || (req.maxRows !== undefined && emitted >= req.maxRows)) {
          yield {
            seq: seq++,
            columns,
            rows: currentBatch,
            done: req.maxRows !== undefined && emitted >= req.maxRows,
          }
          currentBatch = []

          if (req.maxRows !== undefined && emitted >= req.maxRows) {
            await cursor.close()
            break
          }
        }
      }

      yield {
        seq: seq++,
        columns: columns ?? [{ name: '_id', type: 'bson', nullable: false }],
        rows: currentBatch,
        done: true,
        stats: {
          rowCount: emitted,
          durationMs: Date.now() - startedAt,
          truncated: false,
        },
      }
    } catch (err) {
      throw toCorvusError(err)
    } finally {
      if (abortListener && req.signal) {
        req.signal.removeEventListener('abort', abortListener)
      }
      this.running.delete(handleId)
    }
  }

  async beginTransaction(_opts?: TxOptions): Promise<Transaction> {
    const session = this.client.startSession()
    session.startTransaction()
    return {
      id: `mongo-tx-${Date.now()}`,
      async commit() {
        await session.commitTransaction()
        await session.endSession()
      },
      async rollback() {
        await session.abortTransaction()
        await session.endSession()
      },
      async savepoint() {
        // Not supported in Mongo
      },
      async rollbackTo() {
        // Not supported in Mongo
      },
    }
  }

  async cancel(handle: StatementHandle): Promise<void> {
    const cancelFn = this.running.get(handle.id)
    if (!cancelFn) return
    try {
      await cancelFn()
    } catch {
      // ignore
    }
  }

  async ping(): Promise<number> {
    const t0 = Date.now()
    await this.client.db(this.defaultDb).command({ ping: 1 })
    return Date.now() - t0
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.client.close()
  }
}

export class MongoDriver implements DatabaseDriver {
  readonly id = 'mongodb' as const
  readonly displayName = 'MongoDB'
  readonly capabilities = MONGO_CAPABILITIES
  readonly defaultPort = 27017

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    const port = profile.port ?? 27017
    const host = profile.host ?? 'localhost'
    const dbName = profile.database ?? 'admin'

    let authString = ''
    if (profile.user) {
      authString = `${encodeURIComponent(profile.user)}:${encodeURIComponent(profile.password ?? '')}@`
    }

    const authSource = (profile as { authSource?: string }).authSource ?? 'admin'
    const url = `mongodb://${authString}${host}:${port}/${dbName}?authSource=${authSource}&serverSelectionTimeoutMS=15000`

    try {
      const client = new MongoClient(url)
      await client.connect()

      let versionString = ''
      try {
        const buildInfo = await client.db(dbName).command({ buildInfo: 1 })
        versionString = (buildInfo.version as string) ?? ''
      } catch {
        // ignore
      }

      const serverVersion = parseMongoServerVersion(versionString)
      return new MongoConnection(client, serverVersion, MONGO_CAPABILITIES, profile.database ?? 'test')
    } catch (err) {
      throw toCorvusError(err)
    }
  }
}

export const mongoDriver = new MongoDriver()
