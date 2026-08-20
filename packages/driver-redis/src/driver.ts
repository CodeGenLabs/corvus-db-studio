import Redis from 'ioredis'
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
import { REDIS_CAPABILITIES } from './capabilities'
import { toCorvusError } from './errors'
import { RedisIntrospector } from './introspect'
import { toCellValue } from './value'

function parseRedisServerVersion(infoString: string): ServerVersion {
  const match = /redis_version:(\d+)\.(\d+)(?:\.(\d+))?/.exec(infoString)
  return {
    raw: infoString,
    major: match ? parseInt(match[1] ?? '0', 10) : 0,
    minor: match ? parseInt(match[2] ?? '0', 10) : 0,
    patch: match && match[3] ? parseInt(match[3], 10) : 0,
  }
}

export class RedisConnection implements DriverConnection {
  readonly driverId = 'redis' as const
  readonly introspect: Introspector
  private closed = false

  constructor(
    private readonly redis: Redis,
    readonly serverVersion: ServerVersion,
    readonly capabilities: CapabilitySet,
  ) {
    this.introspect = new RedisIntrospector(redis)
  }

  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) throw corvusError('CONNECTION_FAILED', 'Kết nối đã đóng')

    const startedAt = Date.now()
    const rawCmd = (req.command as string) ?? req.sql ?? 'PING'
    const parts = rawCmd.trim().split(/\s+/)
    const commandName = parts[0]?.toUpperCase() ?? 'PING'
    const args = parts.slice(1)

    try {
      if (req.signal?.aborted) {
        throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
      }

      // Execute command via ioredis call
      const res = await this.redis.call(commandName, ...args)

      const columns: ColumnDef[] = [
        { name: 'response', type: typeof res, nullable: true },
      ]

      const rows = Array.isArray(res)
        ? res.map((item, idx) => [toCellValue(item), toCellValue(idx)])
        : [[toCellValue(res)]]

      yield {
        seq: 0,
        columns,
        rows,
        done: true,
        stats: {
          rowCount: rows.length,
          durationMs: Date.now() - startedAt,
          truncated: false,
        },
      }
    } catch (err) {
      throw toCorvusError(err)
    }
  }

  async beginTransaction(_opts?: TxOptions): Promise<Transaction> {
    const multi = this.redis.multi()
    return {
      id: `redis-tx-${Date.now()}`,
      async commit() {
        await multi.exec()
      },
      async rollback() {
        await multi.discard()
      },
      async savepoint() {},
      async rollbackTo() {},
    }
  }

  async cancel(_handle: StatementHandle): Promise<void> {
    // Redis is single-threaded per connection
  }

  async ping(): Promise<number> {
    const t0 = Date.now()
    await this.redis.ping()
    return Date.now() - t0
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.redis.quit()
  }
}

export class RedisDriver implements DatabaseDriver {
  readonly id = 'redis' as const
  readonly displayName = 'Redis'
  readonly capabilities = REDIS_CAPABILITIES
  readonly defaultPort = 6379

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    const port = profile.port ?? 6379
    const host = profile.host ?? 'localhost'
    const db = profile.database ? parseInt(profile.database.replace('db', ''), 10) || 0 : 0

    try {
      const redis = new Redis({
        host,
        port,
        password: profile.password,
        username: profile.user,
        db,
        connectTimeout: 15_000,
        lazyConnect: true,
      })

      await redis.connect()

      let info = ''
      try {
        info = await redis.info('server')
      } catch {
        // ignore
      }

      const serverVersion = parseRedisServerVersion(info)
      return new RedisConnection(redis, serverVersion, REDIS_CAPABILITIES)
    } catch (err) {
      throw toCorvusError(err)
    }
  }
}

export const redisDriver = new RedisDriver()
