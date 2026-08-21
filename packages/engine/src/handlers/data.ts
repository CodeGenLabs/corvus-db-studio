import { corvusError } from '@corvus/contract'
import {
  quoteIdentifier,
  quoteLiteral,
  splitStatements,
  type SqlDialect,
} from '@corvus/sql'
import type { EngineRouter } from '../router'
import {
  requireProfile,
  resolveConnection,
  type HandlerDeps,
} from './context'

const DEFAULT_QUERY_MAX_ROWS = 500_000
const MAX_CONCURRENT_STREAMS_PER_CONNECTION = 4

function formatSqlValue(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  return quoteLiteral(String(value), dialect)
}

interface DataBrowseParams {
  connectionId: string
  database?: string
  schema?: string
  table: string
  filter?: Array<{ join: string; field: string; op: string; value: string }>
  sort?: Array<{ field: string; dir: 'ASC' | 'DESC' }>
  limit?: number
  offset?: number
}

export function buildBrowseSql(params: DataBrowseParams, dialect: SqlDialect): string {
  const parts: string[] = []

  const quotedTable = quoteIdentifier(params.table, dialect)
  const quotedTarget = params.schema
    ? `${quoteIdentifier(params.schema, dialect)}.${quotedTable}`
    : quotedTable

  parts.push(`SELECT * FROM ${quotedTarget}`)

  // Filter clause
  if (params.filter && params.filter.length > 0) {
    const whereParts: string[] = []
    for (let i = 0; i < params.filter.length; i++) {
      const f = params.filter[i]
      if (!f) continue
      const quotedField = quoteIdentifier(f.field, dialect)
      const op = f.op.toUpperCase().trim()
      let safeExpr = ''

      if (op === 'IS NULL' || op === 'IS NOT NULL') {
        safeExpr = `${quotedField} ${op}`
      } else if (op === 'LIKE' || op === 'ILIKE') {
        safeExpr = `${quotedField} ${op} ${quoteLiteral(f.value, dialect)}`
      } else if (op === '=' || op === '!=' || op === '<>' || op === '>' || op === '<' || op === '>=' || op === '<=') {
        safeExpr = `${quotedField} ${op} ${quoteLiteral(f.value, dialect)}`
      } else {
        safeExpr = `${quotedField} = ${quoteLiteral(f.value, dialect)}`
      }

      if (i === 0) {
        whereParts.push(safeExpr)
      } else {
        const joinKw = f.join?.toUpperCase() === 'OR' ? 'OR' : 'AND'
        whereParts.push(`${joinKw} ${safeExpr}`)
      }
    }
    parts.push(`WHERE ${whereParts.join(' ')}`)
  }

  // Sort clause
  if (params.sort && params.sort.length > 0) {
    const sortParts = params.sort.map((s) => {
      const quotedField = quoteIdentifier(s.field, dialect)
      const dir = s.dir === 'DESC' ? 'DESC' : 'ASC'
      return `${quotedField} ${dir}`
    })
    parts.push(`ORDER BY ${sortParts.join(', ')}`)
  }

  // Pagination
  const limit = Math.max(1, Math.min(params.limit ?? 100, 100_000))
  const offset = Math.max(0, params.offset ?? 0)
  parts.push(`LIMIT ${limit} OFFSET ${offset}`)

  return parts.join(' ')
}

export function registerDataHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
  activeStreamsPerConnection: Map<string, number>,
): void {
  // ── data.browse (STREAM) ──────────────────────────────────────────────────
  router.registerStream('data.browse', async function* (params, ctx, opts) {
    const p = params as DataBrowseParams
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const sql = buildBrowseSql(p, dialect)

    const running = activeStreamsPerConnection.get(p.connectionId) ?? 0
    if (running >= MAX_CONCURRENT_STREAMS_PER_CONNECTION) {
      throw corvusError(
        'UNSUPPORTED_FEATURE',
        `Kết nối này đã có ${running} truy vấn đang chạy (tối đa ${MAX_CONCURRENT_STREAMS_PER_CONNECTION}). Hãy chờ hoặc huỷ một truy vấn.`,
        { i18nKey: 'error.tooManyConcurrentStreams' },
      )
    }
    activeStreamsPerConnection.set(p.connectionId, running + 1)

    try {
      yield* conn.execute({
        sql,
        chunkSize: 1000,
        maxRows: DEFAULT_QUERY_MAX_ROWS,
        signal: opts.signal,
      })
    } finally {
      const left = (activeStreamsPerConnection.get(p.connectionId) ?? 1) - 1
      if (left <= 0) activeStreamsPerConnection.delete(p.connectionId)
      else activeStreamsPerConnection.set(p.connectionId, left)
    }
  })

  // ── data.count (UNARY) ────────────────────────────────────────────────────
  router.registerUnary('data.count', async (params, ctx) => {
    const p = params as {
      connectionId: string
      database?: string
      schema?: string
      table: string
      estimate?: boolean
    }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const quotedTable = quoteIdentifier(p.table, dialect)
    const quotedTarget = p.schema
      ? `${quoteIdentifier(p.schema, dialect)}.${quotedTable}`
      : quotedTable

    const sql = `SELECT COUNT(*) AS total_rows FROM ${quotedTarget}`
    let count = 0

    const iter = conn.execute({ sql, maxRows: 1 })
    for await (const chunk of iter) {
      if (chunk.rows && chunk.rows.length > 0 && chunk.rows[0] && chunk.rows[0][0]) {
        const cell = chunk.rows[0][0]
        const raw = cell && typeof cell === 'object' && 'v' in cell ? (cell as { v: unknown }).v : cell
        count = Number(raw ?? 0)
      }
    }

    return { count, isEstimate: false }
  })

  // ── data.previewChanges (UNARY) ───────────────────────────────────────────
  router.registerUnary('data.previewChanges', async (params, ctx) => {
    const p = params as {
      connectionId: string
      database?: string
      schema?: string
      table: string
      inserts?: Array<Record<string, unknown>>
      updates?: Array<{ keys: Record<string, unknown>; values: Record<string, unknown> }>
      deletes?: Array<Record<string, unknown>>
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const quotedTable = quoteIdentifier(p.table, dialect)
    const quotedTarget = p.schema
      ? `${quoteIdentifier(p.schema, dialect)}.${quotedTable}`
      : quotedTable

    const statements: string[] = []

    // 1. DELETES first
    if (p.deletes && p.deletes.length > 0) {
      for (const del of p.deletes) {
        const whereClauses = Object.entries(del).map(([k, v]) => {
          const quotedCol = quoteIdentifier(k, dialect)
          if (v === null || v === undefined) return `${quotedCol} IS NULL`
          return `${quotedCol} = ${formatSqlValue(v, dialect)}`
        })
        if (whereClauses.length > 0) {
          statements.push(`DELETE FROM ${quotedTarget} WHERE ${whereClauses.join(' AND ')};`)
        }
      }
    }

    // 2. UPDATES second
    if (p.updates && p.updates.length > 0) {
      for (const upd of p.updates) {
        const setClauses = Object.entries(upd.values).map(([k, v]) => {
          return `${quoteIdentifier(k, dialect)} = ${formatSqlValue(v, dialect)}`
        })
        const whereClauses = Object.entries(upd.keys).map(([k, v]) => {
          const quotedCol = quoteIdentifier(k, dialect)
          if (v === null || v === undefined) return `${quotedCol} IS NULL`
          return `${quotedCol} = ${formatSqlValue(v, dialect)}`
        })
        if (setClauses.length > 0 && whereClauses.length > 0) {
          statements.push(
            `UPDATE ${quotedTarget} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`,
          )
        }
      }
    }

    // 3. INSERTS last
    if (p.inserts && p.inserts.length > 0) {
      for (const ins of p.inserts) {
        const entries = Object.entries(ins)
        if (entries.length > 0) {
          const quotedCols = entries.map(([k]) => quoteIdentifier(k, dialect)).join(', ')
          const quotedVals = entries.map(([, v]) => formatSqlValue(v, dialect)).join(', ')
          statements.push(`INSERT INTO ${quotedTarget} (${quotedCols}) VALUES (${quotedVals});`)
        }
      }
    }

    const sql = statements.length > 0 ? statements.join('\n') : '-- Không có thay đổi nào'
    const previewToken = router.tokenManager.issue('data.applyChanges', sql, p.connectionId)

    return {
      sql,
      previewToken,
      warnings: [],
    }
  })

  // ── data.applyChanges (UNARY) ─────────────────────────────────────────────
  router.registerUnary('data.applyChanges', async (params, ctx) => {
    const p = params as { previewToken: string }
    const payload = router.tokenManager.consume(p.previewToken, 'data.applyChanges')

    if (!payload.connectionId) {
      throw corvusError('INVALID_INPUT', 'Thiếu connectionId trong preview token')
    }

    const profile = await requireProfile(deps, payload.connectionId)
    if (profile.readOnly) {
      throw corvusError('FORBIDDEN', 'Kết nối đang ở chế độ chỉ đọc (read-only)', {
        i18nKey: 'error.readOnlyForbidden',
      })
    }

    const conn = await resolveConnection(deps, payload.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'
    const statements = splitStatements(payload.sql, dialect).filter(
      (s) => s.trim().length > 0 && !s.trim().startsWith('--'),
    )

    let affectedRows = 0
    for (const stmt of statements) {
      const iter = conn.execute({ sql: stmt, maxRows: 1 })
      for await (const chunk of iter) {
        if (chunk.stats?.affectedRows !== undefined) {
          affectedRows += chunk.stats.affectedRows
        }
      }
    }

    return {
      affectedRows,
      success: true,
    }
  })

  // ── data.fkLookup (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('data.fkLookup', async (params, ctx) => {
    const p = params as {
      connectionId: string
      referencedTable: string
      referencedColumn: string
      search?: string
      limit?: number
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    let quotedTable: string
    if (p.referencedTable.includes('.')) {
      const [schemaPart, tablePart] = p.referencedTable.split('.')
      quotedTable = schemaPart && tablePart
        ? `${quoteIdentifier(schemaPart, dialect)}.${quoteIdentifier(tablePart, dialect)}`
        : quoteIdentifier(p.referencedTable, dialect)
    } else {
      quotedTable = quoteIdentifier(p.referencedTable, dialect)
    }

    const quotedCol = quoteIdentifier(p.referencedColumn, dialect)
    const limit = Math.max(1, Math.min(p.limit ?? 20, 100))

    let sql = `SELECT DISTINCT ${quotedCol} AS key_val, ${quotedCol} AS label_val FROM ${quotedTable}`
    if (p.search && p.search.trim().length > 0) {
      const safeSearch = quoteLiteral(`%${p.search.trim()}%`, dialect)
      sql += ` WHERE CAST(${quotedCol} AS VARCHAR(255)) LIKE ${safeSearch}`
    }
    sql += ` LIMIT ${limit}`

    const results: Array<{ key: string; label: string }> = []
    const iter = conn.execute({ sql, maxRows: limit })

    for await (const chunk of iter) {
      if (chunk.rows) {
        for (const row of chunk.rows) {
          if (row && row[0] !== undefined && row[1] !== undefined) {
            const raw0 = row[0] && typeof row[0] === 'object' && 'v' in row[0] ? (row[0] as { v: unknown }).v : row[0]
            const raw1 = row[1] && typeof row[1] === 'object' && 'v' in row[1] ? (row[1] as { v: unknown }).v : row[1]
            results.push({
              key: String(raw0 ?? ''),
              label: String(raw1 ?? ''),
            })
          }
        }
      }
    }

    return results
  })
}
