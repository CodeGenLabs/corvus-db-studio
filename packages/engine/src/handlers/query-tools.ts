import {
  formatSql,
  statementKind,
  splitStatements,
  type SqlDialect,
} from '@corvus/sql'
import type { EngineRouter } from '../router'
import {
  resolveConnection,
  type HandlerDeps,
} from './context'

export interface QueryHistoryEntry {
  id: string
  sql: string
  executedAt: string
  durationMs: number
  connectionName: string
  status: 'success' | 'error'
}

/** Lưu trữ lịch sử câu lệnh đã chạy. */
const queryHistory: QueryHistoryEntry[] = []

export function recordQueryHistory(entry: QueryHistoryEntry): void {
  queryHistory.unshift(entry)
  // Giới hạn 500 mục gần nhất trong bộ nhớ
  if (queryHistory.length > 500) {
    queryHistory.length = 500
  }
}

export function registerQueryToolsHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
): void {
  // ── query.explain (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('query.explain', async (params, ctx) => {
    const p = params as {
      connectionId: string
      sql: string
      analyze?: boolean
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    let explainSql = ''
    if (dialect === 'postgres') {
      explainSql = `EXPLAIN (FORMAT JSON, ANALYZE ${p.analyze ? 'TRUE' : 'FALSE'}) ${p.sql}`
    } else if (dialect === 'mysql') {
      explainSql = `EXPLAIN FORMAT=JSON ${p.sql}`
    } else if (dialect === 'sqlite') {
      explainSql = `EXPLAIN QUERY PLAN ${p.sql}`
    } else {
      explainSql = `EXPLAIN ${p.sql}`
    }

    let raw = ''
    let plan: unknown = null
    let format: 'tree' | 'json' | 'text' = 'text'

    try {
      const iter = conn.execute({ sql: explainSql, maxRows: 1000 })
      const rows = []
      for await (const chunk of iter) {
        if (chunk.rows) rows.push(...chunk.rows)
      }

      if (rows.length > 0 && rows[0] && rows[0][0] !== undefined) {
        const firstCell = rows[0][0]
        const cellVal =
          firstCell && typeof firstCell === 'object' && 'v' in firstCell
            ? (firstCell as { v: unknown }).v
            : firstCell

        if (typeof cellVal === 'string' && (cellVal.trim().startsWith('{') || cellVal.trim().startsWith('['))) {
          try {
            plan = JSON.parse(cellVal)
            format = 'json'
            raw = cellVal
          } catch {
            raw = rows
              .map((r) => {
                const c = r[0]
                const v = c && typeof c === 'object' && 'v' in c ? (c as { v: unknown }).v : c
                return String(v ?? '')
              })
              .join('\n')
            plan = raw
            format = 'text'
          }
        } else if (typeof cellVal === 'object' && cellVal !== null) {
          plan = cellVal
          format = 'json'
          raw = JSON.stringify(cellVal, null, 2)
        } else {
          raw = rows
            .map((r) => {
              const c = r[0]
              const v = c && typeof c === 'object' && 'v' in c ? (c as { v: unknown }).v : c
              return String(v ?? '')
            })
            .join('\n')
          plan = raw
          format = 'text'
        }
      }
    } catch {
      // Fallback to simple EXPLAIN nếu JSON format không được hỗ trợ
      const fallbackIter = conn.execute({ sql: `EXPLAIN ${p.sql}`, maxRows: 1000 })
      const rows = []
      for await (const chunk of fallbackIter) {
        if (chunk.rows) rows.push(...chunk.rows)
      }
      raw = rows
        .map((r) =>
          r
            .map((c) => {
              const v = c && typeof c === 'object' && 'v' in c ? (c as { v: unknown }).v : c
              return String(v ?? '')
            })
            .join(' | '),
        )
        .join('\n')
      plan = raw
      format = 'text'
    }

    return {
      format,
      plan: plan ?? raw,
      raw: raw || '-- Không có kế hoạch thực thi',
    }
  })

  // ── query.format (UNARY) ──────────────────────────────────────────────────
  router.registerUnary('query.format', async (params) => {
    const p = params as { sql: string; dialect?: string; uppercase?: boolean }
    if (!p.sql || p.sql.trim().length === 0) {
      return { sql: '' }
    }
    const formatted = formatSql(p.sql)
    return { sql: formatted }
  })

  // ── query.parse (UNARY) ───────────────────────────────────────────────────
  router.registerUnary('query.parse', async (params) => {
    const p = params as { sql: string; dialect?: string }
    const dialect = (p.dialect as SqlDialect) ?? 'postgres'
    const sql = p.sql ?? ''

    if (sql.trim().length === 0) {
      return { statements: [] }
    }

    const stmts = splitStatements(sql, dialect)
    let currentOffset = 0

    const statements = stmts.map((stmt) => {
      const trimmed = stmt.trim()
      const type = statementKind(trimmed, dialect).toUpperCase()

      const idx = sql.indexOf(stmt, currentOffset)
      const startLine = idx >= 0 ? sql.slice(0, idx).split('\n').length : 1
      const endLine = idx >= 0 ? sql.slice(0, idx + stmt.length).split('\n').length : startLine
      currentOffset = idx >= 0 ? idx + stmt.length : currentOffset

      return {
        sql: trimmed,
        type,
        startLine,
        endLine,
      }
    })

    return { statements }
  })

  // ── query.cancel (UNARY) ──────────────────────────────────────────────────
  router.registerUnary('query.cancel', async (_params) => {
    return { success: true }
  })

  // ── query.history.list (UNARY) ────────────────────────────────────────────
  router.registerUnary('query.history.list', async (params) => {
    const p = params as { limit?: number }
    const limit = Math.max(1, Math.min(p.limit ?? 50, 500))
    return queryHistory.slice(0, limit)
  })

  // ── query.history.clear (UNARY) ───────────────────────────────────────────
  router.registerUnary('query.history.clear', async () => {
    queryHistory.length = 0
    return { success: true }
  })
}
