import oracledb from 'oracledb'
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
import { ORACLE_CAPABILITIES, narrowOracleCapabilities } from './capabilities'
import { toCorvusError } from './errors'
import { OracleIntrospector } from './introspect'
import { toCellValue } from './value'

const DEFAULT_CHUNK_SIZE = 100

function parseOracleServerVersion(versionString: string): ServerVersion {
  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(versionString)
  return {
    raw: versionString,
    major: match ? parseInt(match[1] ?? '0', 10) : 0,
    minor: match ? parseInt(match[2] ?? '0', 10) : 0,
    patch: match && match[3] ? parseInt(match[3], 10) : 0,
  }
}

oracledb.fetchAsString = [oracledb.CLOB, oracledb.NUMBER]

export class OracleTransaction implements Transaction {
  constructor(
    readonly id: string,
    private readonly conn: oracledb.Connection,
  ) {}

  async commit(): Promise<void> {
    await this.conn.commit()
  }

  async rollback(): Promise<void> {
    await this.conn.rollback()
  }

  async savepoint(name: string): Promise<void> {
    if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)) {
      throw corvusError('INVALID_INPUT', 'Tên savepoint không hợp lệ')
    }
    await this.conn.execute(`SAVEPOINT ${name}`)
  }

  async rollbackTo(name: string): Promise<void> {
    if (!/^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(name)) {
      throw corvusError('INVALID_INPUT', 'Tên savepoint không hợp lệ')
    }
    await this.conn.execute(`ROLLBACK TO SAVEPOINT ${name}`)
  }
}

export class OracleConnection implements DriverConnection {
  readonly driverId = 'oracle' as const
  readonly dialect = 'oracle' as const
  readonly introspect: Introspector
  private closed = false
  private readonly running = new Map<string, oracledb.Connection>()

  constructor(
    private readonly pool: oracledb.Pool,
    readonly serverVersion: ServerVersion,
    readonly capabilities: CapabilitySet,
  ) {
    this.introspect = new OracleIntrospector(pool)
  }

  async *execute(req: ExecuteRequest): AsyncIterable<ResultChunk> {
    if (this.closed) throw corvusError('CONNECTION_FAILED', 'Kết nối đã đóng')

    const chunkSize = Math.max(1, req.chunkSize ?? DEFAULT_CHUNK_SIZE)
    const handleId = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const conn = await this.pool.getConnection()
    this.running.set(handleId, conn)

    let seq = 0
    let emitted = 0
    let columns: ColumnDef[] | undefined
    let abortListener: (() => void) | undefined
    const startedAt = Date.now()

    if (req.signal) {
      if (req.signal.aborted) {
        await conn.close().catch(() => {})
        this.running.delete(handleId)
        throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
      }
      abortListener = () => {
        void this.cancel({ id: handleId }).catch(() => {})
      }
      req.signal.addEventListener('abort', abortListener, { once: true })
    }

    const sql = req.sql ?? (typeof req.command === 'string' ? req.command : '')
    try {
      // Execute query with resultSet for streaming
      const result = await conn.execute(sql, req.values ?? [], {
        resultSet: true,
        outFormat: oracledb.OUT_FORMAT_ARRAY,
      })

      const resultSet = result.resultSet
      if (!resultSet) {
        // DDL or DML statement without resultSet
        yield {
          seq: seq++,
          rows: [],
          done: true,
          stats: {
            rowCount: result.rowsAffected ?? 0,
            durationMs: Date.now() - startedAt,
            truncated: false,
          },
        }
        return
      }

      // Column metadata from metaData
      if (result.metaData) {
        columns = result.metaData.map((m) => ({
          name: m.name,
          type: m.dbTypeName?.toLowerCase() ?? 'varchar2',
          nullable: m.nullable ?? true,
        }))
      }

      for (;;) {
        if (req.signal?.aborted) {
          throw corvusError('QUERY_CANCELLED', 'Truy vấn đã bị huỷ')
        }

        const remaining = req.maxRows === undefined ? chunkSize : Math.min(chunkSize, req.maxRows - emitted)
        if (remaining <= 0) {
          yield {
            seq: seq++,
            rows: [],
            done: true,
            stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: true },
          }
          break
        }

        const rowsBatch = await resultSet.getRows(remaining)
        if (!rowsBatch || rowsBatch.length === 0) {
          yield {
            seq: seq++,
            ...(seq === 1 ? { columns } : {}),
            rows: [],
            done: true,
            stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: false },
          }
          break
        }

        const formattedRows = (rowsBatch as unknown[][]).map((row) => {
          return row.map((val, idx) => {
            const colType = columns?.[idx]?.type
            return toCellValue(val, colType)
          })
        })

        emitted += formattedRows.length
        const done = rowsBatch.length < remaining || (req.maxRows !== undefined && emitted >= req.maxRows)

        yield {
          seq: seq++,
          ...(seq === 1 ? { columns } : {}),
          rows: formattedRows,
          done,
          ...(done
            ? { stats: { rowCount: emitted, durationMs: Date.now() - startedAt, truncated: (req.maxRows !== undefined && emitted >= req.maxRows) } }
            : {}),
        }

        if (done) {
          break
        }
      }

      await resultSet.close()
    } catch (err) {
      throw toCorvusError(err)
    } finally {
      if (abortListener && req.signal) {
        req.signal.removeEventListener('abort', abortListener)
      }
      this.running.delete(handleId)
      await conn.close().catch(() => {})
    }
  }

  async beginTransaction(_opts?: TxOptions): Promise<Transaction> {
    const conn = await this.pool.getConnection()
    return new OracleTransaction(`tx-${Date.now()}`, conn)
  }

  async cancel(handle: StatementHandle): Promise<void> {
    const conn = this.running.get(handle.id)
    if (!conn) return
    try {
      await conn.break()
    } catch {
      // ignore
    }
  }

  async ping(): Promise<number> {
    const t0 = Date.now()
    let conn: oracledb.Connection | undefined
    try {
      conn = await this.pool.getConnection()
      await conn.execute('SELECT 1 FROM DUAL')
      return Date.now() - t0
    } finally {
      if (conn) await conn.close()
    }
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.pool.close(0)
  }
}

export class OracleDriver implements DatabaseDriver {
  readonly id = 'oracle' as const
  readonly displayName = 'Oracle Database'
  readonly capabilities = ORACLE_CAPABILITIES
  readonly defaultPort = 1521

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    const port = profile.port ?? 1521
    const host = profile.host ?? 'localhost'
    const service = profile.database ?? 'FREEPDB1'
    const connectString = `${host}:${port}/${service}`

    try {
      const pool = await oracledb.createPool({
        user: profile.user ?? 'SYSTEM',
        password: profile.password ?? '',
        connectString,
        poolMin: 0,
        poolMax: 10,
        poolTimeout: 30,
      })

      const conn = await pool.getConnection()
      let versionString = ''
      try {
        const verRes = await conn.execute<{ BANNER: string }>(
          'SELECT banner AS "BANNER" FROM v$version WHERE ROWNUM = 1',
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
        )
        versionString = verRes.rows?.[0]?.BANNER ?? ''
      } finally {
        await conn.close().catch(() => {})
      }

      const serverVersion = parseOracleServerVersion(versionString)
      const capabilities = narrowOracleCapabilities(versionString)
      return new OracleConnection(pool, serverVersion, capabilities)
    } catch (err) {
      throw toCorvusError(err)
    }
  }
}

export const oracleDriver = new OracleDriver()
