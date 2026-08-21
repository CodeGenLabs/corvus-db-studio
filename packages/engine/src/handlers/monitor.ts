import { quoteLiteral } from '@corvus/sql'
import type { EngineRouter } from '../router'
import {
  resolveConnection,
  type HandlerDeps,
} from './context'

export interface ProcessItem {
  id: string
  user: string
  host: string
  db?: string
  command: string
  timeSec: number
  state: string
  info?: string
}

export function registerMonitorHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
): void {
  // ── monitor.processes (STREAM) ────────────────────────────────────────────
  router.registerStream('monitor.processes', async function* (params, ctx, opts) {
    const p = params as { connectionId: string; intervalMs?: number }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'
    const intervalMs = Math.max(500, Math.min(p.intervalMs ?? 2000, 10_000))

    const signal = opts?.signal
    let seq = 0

    while (!signal?.aborted) {
      const processes: ProcessItem[] = []

      if (dialect === 'postgres') {
        const sql = `SELECT pid::text AS id, COALESCE(usename, '') AS user, COALESCE(client_addr::text, '') AS host, datname AS db, COALESCE(query, '') AS command, COALESCE(EXTRACT(EPOCH FROM (clock_timestamp() - query_start))::int, 0) AS time_sec, COALESCE(state, '') AS state, COALESCE(query, '') AS info FROM pg_stat_activity WHERE pid <> pg_backend_pid() ORDER BY time_sec DESC LIMIT 100`

        try {
          const iter = conn.execute({ sql, maxRows: 100, signal })
          for await (const chunk of iter) {
            if (chunk.rows) {
              for (const row of chunk.rows) {
                const getVal = (idx: number) => {
                  const cell = row[idx]
                  return cell && typeof cell === 'object' && 'v' in cell
                    ? (cell as { v: unknown }).v
                    : cell
                }
                processes.push({
                  id: String(getVal(0) ?? ''),
                  user: String(getVal(1) ?? ''),
                  host: String(getVal(2) ?? ''),
                  db: getVal(3) ? String(getVal(3)) : undefined,
                  command: String(getVal(4) ?? ''),
                  timeSec: Number(getVal(5) ?? 0),
                  state: String(getVal(6) ?? ''),
                  info: getVal(7) ? String(getVal(7)) : undefined,
                })
              }
            }
          }
        } catch {
          // ignore iteration errors during shutdown
        }
      } else {
        // Fallback for other dialects / mock
        processes.push({
          id: '1',
          user: 'current',
          host: '127.0.0.1',
          command: 'IDLE',
          timeSec: 0,
          state: 'active',
        })
      }

      yield {
        seq: seq++,
        processes,
        done: false,
      }

      // Ngắt nếu đã có abort signal
      if (signal?.aborted) {
        break
      }

      // Chờ interval
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, intervalMs)
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            resolve()
          },
          { once: true },
        )
      })
    }

    yield {
      seq: seq++,
      processes: [],
      done: true,
    }
  })

  // ── monitor.killProcess (UNARY) ───────────────────────────────────────────
  router.registerUnary('monitor.killProcess', async (params, ctx) => {
    const p = params as { connectionId: string; processId: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    let sql = ''
    if (dialect === 'postgres') {
      const safePid = quoteLiteral(p.processId, dialect)
      sql = `SELECT pg_terminate_backend(${safePid}::int);`
    } else if (dialect === 'mysql') {
      sql = `KILL ${Number(p.processId)};`
    }

    if (sql.length > 0) {
      const iter = conn.execute({ sql, maxRows: 1 })
      for await (const _ of iter) {
        /* kill */
      }
    }

    return { success: true }
  })

  // ── monitor.variables (UNARY) ─────────────────────────────────────────────
  router.registerUnary('monitor.variables', async (params, ctx) => {
    const p = params as { connectionId: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const variables: Array<{ name: string; value: string }> = []

    if (dialect === 'postgres') {
      const sql = `SELECT name, setting AS value FROM pg_settings ORDER BY name LIMIT 500`
      const iter = conn.execute({ sql, maxRows: 500 })
      for await (const chunk of iter) {
        if (chunk.rows) {
          for (const row of chunk.rows) {
            const rawName =
              row[0] && typeof row[0] === 'object' && 'v' in row[0]
                ? (row[0] as { v: unknown }).v
                : row[0]
            const rawVal =
              row[1] && typeof row[1] === 'object' && 'v' in row[1]
                ? (row[1] as { v: unknown }).v
                : row[1]
            if (rawName !== undefined && rawVal !== undefined) {
              variables.push({
                name: String(rawName),
                value: String(rawVal),
              })
            }
          }
        }
      }
    } else {
      variables.push({ name: 'dialect', value: dialect })
    }

    return variables
  })

  // ── monitor.status (UNARY) ────────────────────────────────────────────────
  router.registerUnary('monitor.status', async (params, ctx) => {
    const p = params as { connectionId: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const status: Record<string, string> = {
      dialect,
      connectedAt: new Date().toISOString(),
    }

    if (dialect === 'postgres') {
      const sql = `SELECT version() AS ver`
      const iter = conn.execute({ sql, maxRows: 1 })
      for await (const chunk of iter) {
        if (chunk.rows && chunk.rows[0] && chunk.rows[0][0]) {
          const raw =
            typeof chunk.rows[0][0] === 'object' && 'v' in chunk.rows[0][0]
              ? (chunk.rows[0][0] as { v: unknown }).v
              : chunk.rows[0][0]
          status['version'] = String(raw ?? '')
        }
      }
    }

    return status
  })
}
