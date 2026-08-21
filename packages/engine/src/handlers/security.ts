import { corvusError } from '@corvus/contract'
import { quoteIdentifier, quoteLiteral, splitStatements } from '@corvus/sql'
import type { EngineRouter } from '../router'
import {
  requireProfile,
  resolveConnection,
  type HandlerDeps,
} from './context'

export interface UserItem {
  user: string
  host?: string
  roles: string[]
  status?: string
}

export interface RoleItem {
  role: string
  members: string[]
}

export interface PrivilegeItem {
  object: string
  privilege: string
  granted: boolean
  inheritedFrom?: string
}

export function registerSecurityHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
): void {
  // ── security.users (UNARY) ────────────────────────────────────────────────
  router.registerUnary('security.users', async (params, ctx) => {
    const p = params as { connectionId: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const users: UserItem[] = []

    if (dialect === 'postgres') {
      const sql = `SELECT u.usename AS user_name, 'localhost' AS host_name, COALESCE(u.usesysid::text, '') AS status FROM pg_catalog.pg_user u ORDER BY u.usename`
      const iter = conn.execute({ sql, maxRows: 200 })
      for await (const chunk of iter) {
        if (chunk.rows) {
          for (const row of chunk.rows) {
            const rawUser =
              row[0] && typeof row[0] === 'object' && 'v' in row[0]
                ? (row[0] as { v: unknown }).v
                : row[0]
            const rawHost =
              row[1] && typeof row[1] === 'object' && 'v' in row[1]
                ? (row[1] as { v: unknown }).v
                : row[1]
            if (rawUser !== undefined) {
              users.push({
                user: String(rawUser),
                host: String(rawHost ?? 'localhost'),
                roles: [],
                status: 'active',
              })
            }
          }
        }
      }
    } else {
      users.push({
        user: 'root',
        host: 'localhost',
        roles: ['admin'],
        status: 'active',
      })
    }

    return users
  })

  // ── security.roles (UNARY) ────────────────────────────────────────────────
  router.registerUnary('security.roles', async (params, ctx) => {
    const p = params as { connectionId: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const roles: RoleItem[] = []

    if (dialect === 'postgres') {
      const sql = `SELECT rolname FROM pg_catalog.pg_roles WHERE rolcanlogin = false ORDER BY rolname`
      const iter = conn.execute({ sql, maxRows: 200 })
      for await (const chunk of iter) {
        if (chunk.rows) {
          for (const row of chunk.rows) {
            const rawRole =
              row[0] && typeof row[0] === 'object' && 'v' in row[0]
                ? (row[0] as { v: unknown }).v
                : row[0]
            if (rawRole !== undefined) {
              roles.push({
                role: String(rawRole),
                members: [],
              })
            }
          }
        }
      }
    }

    return roles
  })

  // ── security.privileges (UNARY) ───────────────────────────────────────────
  router.registerUnary('security.privileges', async (params, ctx) => {
    const p = params as { connectionId: string; userOrRole: string }
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const privileges: PrivilegeItem[] = []

    if (dialect === 'postgres') {
      const safeGrantee = quoteLiteral(p.userOrRole, dialect)
      const sql = `SELECT table_schema || '.' || table_name AS object_name, privilege_type AS priv, is_grantable AS grantable FROM information_schema.table_privileges WHERE grantee = ${safeGrantee} LIMIT 200`
      const iter = conn.execute({ sql, maxRows: 200 })
      for await (const chunk of iter) {
        if (chunk.rows) {
          for (const row of chunk.rows) {
            const rawObj =
              row[0] && typeof row[0] === 'object' && 'v' in row[0]
                ? (row[0] as { v: unknown }).v
                : row[0]
            const rawPriv =
              row[1] && typeof row[1] === 'object' && 'v' in row[1]
                ? (row[1] as { v: unknown }).v
                : row[1]
            const rawGrantable =
              row[2] && typeof row[2] === 'object' && 'v' in row[2]
                ? (row[2] as { v: unknown }).v
                : row[2]
            if (rawObj !== undefined && rawPriv !== undefined) {
              privileges.push({
                object: String(rawObj),
                privilege: String(rawPriv),
                granted: String(rawGrantable).toUpperCase() === 'YES',
              })
            }
          }
        }
      }
    }

    return privileges
  })

  // ── security.previewGrant (UNARY) ─────────────────────────────────────────
  router.registerUnary('security.previewGrant', async (params, ctx) => {
    const p = params as {
      connectionId: string
      userOrRole: string
      grants: Array<{ object: string; privilege: string; grant: boolean }>
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'
    const quotedTargetUser = quoteIdentifier(p.userOrRole, dialect)

    const statements: string[] = []

    for (const g of p.grants) {
      const safePriv = g.privilege.toUpperCase()
      const quotedObject = g.object.includes('.')
        ? g.object
            .split('.')
            .map((part) => quoteIdentifier(part, dialect))
            .join('.')
        : quoteIdentifier(g.object, dialect)

      if (g.grant) {
        statements.push(`GRANT ${safePriv} ON ${quotedObject} TO ${quotedTargetUser};`)
      } else {
        statements.push(`REVOKE ${safePriv} ON ${quotedObject} FROM ${quotedTargetUser};`)
      }
    }

    const sql = statements.join('\n')
    const previewToken = router.tokenManager.issue('security.applyGrant', sql, p.connectionId)

    return {
      sql,
      previewToken,
      warnings: [],
    }
  })

  // ── security.applyGrant (UNARY) ───────────────────────────────────────────
  router.registerUnary('security.applyGrant', async (params, ctx) => {
    const p = params as { previewToken: string }
    const payload = router.tokenManager.consume(p.previewToken, 'security.applyGrant')

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

    for (const stmt of statements) {
      const iter = conn.execute({ sql: stmt, maxRows: 1 })
      for await (const _ of iter) {
        /* grant/revoke */
      }
    }

    return { success: true }
  })
}
