import { corvusError } from '@corvus/contract'
import { quoteIdentifier, splitStatements } from '@corvus/sql'
import type { EngineRouter } from '../router'
import {
  requireProfile,
  resolveConnection,
  type HandlerDeps,
} from './context'

export interface ColumnDesign {
  name: string
  type: string
  nullable?: boolean
  primaryKey?: boolean
  defaultValue?: unknown
  unique?: boolean
}

export interface ForeignKeyDesign {
  name?: string
  column: string
  referencedTable: string
  referencedColumn: string
}

export interface TableDesign {
  name: string
  schema?: string
  columns?: ColumnDesign[]
  foreignKeys?: ForeignKeyDesign[]
}

export interface ViewDesign {
  name: string
  schema?: string
  query: string
  orReplace?: boolean
}

export interface RoutineDesign {
  name: string
  schema?: string
  kind?: 'FUNCTION' | 'PROCEDURE'
  params?: string
  returnType?: string
  body?: string
  sql?: string
}

export function registerDdlHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
): void {
  // ── ddl.previewTable (UNARY) ──────────────────────────────────────────────
  router.registerUnary('ddl.previewTable', async (params, ctx) => {
    const p = params as {
      connectionId: string
      tableDesign: Record<string, unknown>
    }

    const design = p.tableDesign as unknown as TableDesign
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const tableName = String(design.name || 'unnamed_table')
    const quotedTable = quoteIdentifier(tableName, dialect)
    const quotedTarget = design.schema
      ? `${quoteIdentifier(design.schema, dialect)}.${quotedTable}`
      : quotedTable

    const colLines: string[] = []
    const pkCols: string[] = []

    if (design.columns && Array.isArray(design.columns)) {
      for (const col of design.columns) {
        const quotedColName = quoteIdentifier(col.name, dialect)
        let line = `  ${quotedColName} ${col.type}`

        if (col.primaryKey) {
          pkCols.push(quotedColName)
        }
        if (col.nullable === false) {
          line += ' NOT NULL'
        }
        if (col.unique) {
          line += ' UNIQUE'
        }
        if (col.defaultValue !== undefined && col.defaultValue !== null) {
          line += ` DEFAULT ${String(col.defaultValue)}`
        }
        colLines.push(line)
      }
    }

    if (pkCols.length > 0) {
      colLines.push(`  PRIMARY KEY (${pkCols.join(', ')})`)
    }

    if (design.foreignKeys && Array.isArray(design.foreignKeys)) {
      for (const fk of design.foreignKeys) {
        const quotedFkCol = quoteIdentifier(fk.column, dialect)
        const quotedRefTable = fk.referencedTable.includes('.')
          ? fk.referencedTable
              .split('.')
              .map((part) => quoteIdentifier(part, dialect))
              .join('.')
          : quoteIdentifier(fk.referencedTable, dialect)
        const quotedRefCol = quoteIdentifier(fk.referencedColumn, dialect)
        colLines.push(
          `  FOREIGN KEY (${quotedFkCol}) REFERENCES ${quotedRefTable} (${quotedRefCol})`,
        )
      }
    }

    const safeCols = colLines.join(',\n')
    const sql = `CREATE TABLE ${quotedTarget} (\n${safeCols}\n);`
    const previewToken = router.tokenManager.issue('ddl.applyTable', sql, p.connectionId)

    return {
      sql,
      previewToken,
      warnings: [],
    }
  })

  // ── ddl.applyTable (UNARY) ────────────────────────────────────────────────
  router.registerUnary('ddl.applyTable', async (params, ctx) => {
    const p = params as { previewToken: string }
    const payload = router.tokenManager.consume(p.previewToken, 'ddl.applyTable')

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
        /* thực thi DDL */
      }
    }

    return { success: true }
  })

  // ── ddl.previewView (UNARY) ───────────────────────────────────────────────
  router.registerUnary('ddl.previewView', async (params, ctx) => {
    const p = params as {
      connectionId: string
      viewDesign: Record<string, unknown>
    }

    const design = p.viewDesign as unknown as ViewDesign
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    const viewName = String(design.name || 'unnamed_view')
    const quotedView = quoteIdentifier(viewName, dialect)
    const quotedTarget = design.schema
      ? `${quoteIdentifier(design.schema, dialect)}.${quotedView}`
      : quotedView

    const safeQuery = (design.query || 'SELECT 1').trim()
    const sql = `CREATE OR REPLACE VIEW ${quotedTarget} AS\n${safeQuery};`
    const previewToken = router.tokenManager.issue('ddl.applyView', sql, p.connectionId)

    return {
      sql,
      previewToken,
      warnings: [],
    }
  })

  // ── ddl.applyView (UNARY) ─────────────────────────────────────────────────
  router.registerUnary('ddl.applyView', async (params, ctx) => {
    const p = params as { previewToken: string }
    const payload = router.tokenManager.consume(p.previewToken, 'ddl.applyView')

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
        /* thực thi DDL */
      }
    }

    return { success: true }
  })

  // ── ddl.previewRoutine (UNARY) ────────────────────────────────────────────
  router.registerUnary('ddl.previewRoutine', async (params, ctx) => {
    const p = params as {
      connectionId: string
      routineDesign: Record<string, unknown>
    }

    const design = p.routineDesign as unknown as RoutineDesign
    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    let sql = ''
    if (design.sql && design.sql.trim().length > 0) {
      sql = design.sql.trim()
    } else {
      const routineName = String(design.name || 'unnamed_routine')
      const quotedName = quoteIdentifier(routineName, dialect)
      const quotedTarget = design.schema
        ? `${quoteIdentifier(design.schema, dialect)}.${quotedName}`
        : quotedName
      const kind = design.kind ?? 'FUNCTION'
      const paramsList = design.params ?? ''
      const returnType = design.returnType ?? 'VOID'
      const safeBody = design.body ?? 'BEGIN\n  -- routine body\nEND;'

      if (kind === 'FUNCTION') {
        sql = `CREATE OR REPLACE FUNCTION ${quotedTarget}(${paramsList})\nRETURNS ${returnType} AS $$\n${safeBody}\n$$ LANGUAGE plpgsql;`
      } else {
        sql = `CREATE OR REPLACE PROCEDURE ${quotedTarget}(${paramsList})\nAS $$\n${safeBody}\n$$ LANGUAGE plpgsql;`
      }
    }

    const previewToken = router.tokenManager.issue('ddl.applyRoutine', sql, p.connectionId)

    return {
      sql,
      previewToken,
      warnings: [],
    }
  })

  // ── ddl.applyRoutine (UNARY) ──────────────────────────────────────────────
  router.registerUnary('ddl.applyRoutine', async (params, ctx) => {
    const p = params as { previewToken: string }
    const payload = router.tokenManager.consume(p.previewToken, 'ddl.applyRoutine')

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
        /* thực thi DDL */
      }
    }

    return { success: true }
  })

  // ── ddl.dropObject (UNARY) ────────────────────────────────────────────────
  router.registerUnary('ddl.dropObject', async (params, ctx) => {
    const p = params as {
      connectionId: string
      kind: string
      name: string
      cascade?: boolean
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    let quotedTarget: string
    if (p.name.includes('.')) {
      quotedTarget = p.name
        .split('.')
        .map((part) => quoteIdentifier(part, dialect))
        .join('.')
    } else {
      quotedTarget = quoteIdentifier(p.name, dialect)
    }

    const kindUpper = p.kind.trim().toUpperCase()
    const cascadeClause = p.cascade ? ' CASCADE' : ''
    const sql = `DROP ${kindUpper} ${quotedTarget}${cascadeClause};`
    const previewToken = router.tokenManager.issue('ddl.applyTable', sql, p.connectionId)

    return {
      sql,
      previewToken,
      warnings: [
        `Thao tác DROP ${kindUpper} sẽ xoá vĩnh viễn đối tượng '${p.name}' khỏi cơ sở dữ liệu.`,
      ],
    }
  })

  // ── ddl.maintain (UNARY) ──────────────────────────────────────────────────
  router.registerUnary('ddl.maintain', async (params, ctx) => {
    const p = params as {
      connectionId: string
      table: string
      action: 'analyze' | 'optimize' | 'vacuum' | 'reindex' | 'repair'
    }

    const profile = await requireProfile(deps, p.connectionId)
    if (profile.readOnly) {
      throw corvusError('FORBIDDEN', 'Kết nối đang ở chế độ chỉ đọc (read-only)', {
        i18nKey: 'error.readOnlyForbidden',
      })
    }

    const conn = await resolveConnection(deps, p.connectionId, ctx.actor.id)
    const dialect = conn.dialect ?? 'postgres'

    let quotedTarget: string
    if (p.table.includes('.')) {
      quotedTarget = p.table
        .split('.')
        .map((part) => quoteIdentifier(part, dialect))
        .join('.')
    } else {
      quotedTarget = quoteIdentifier(p.table, dialect)
    }

    let sql = ''
    if (dialect === 'postgres') {
      if (p.action === 'vacuum') sql = `VACUUM ${quotedTarget};`
      else if (p.action === 'analyze') sql = `ANALYZE ${quotedTarget};`
      else if (p.action === 'reindex') sql = `REINDEX TABLE ${quotedTarget};`
      else sql = `VACUUM FULL ${quotedTarget};`
    } else if (dialect === 'mysql') {
      if (p.action === 'analyze') sql = `ANALYZE TABLE ${quotedTarget};`
      else if (p.action === 'repair') sql = `REPAIR TABLE ${quotedTarget};`
      else sql = `OPTIMIZE TABLE ${quotedTarget};`
    } else if (dialect === 'sqlite') {
      if (p.action === 'vacuum') sql = `VACUUM;`
      else if (p.action === 'analyze') sql = `ANALYZE ${quotedTarget};`
      else sql = `REINDEX ${quotedTarget};`
    } else {
      sql = `ANALYZE ${quotedTarget};`
    }

    const iter = conn.execute({ sql, maxRows: 100 })
    for await (const _ of iter) {
      /* thực thi maintenance */
    }

    return {
      success: true,
      message: `Thao tác ${p.action} trên ${p.table} đã hoàn tất thành công.`,
    }
  })
}
