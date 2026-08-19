import type { SqlDialect } from './dialect'
import { quoteIdentifier, quoteLiteral, sqlKeyword } from './dialect'

export interface QueryField {
  table?: string
  name: string
  alias?: string
  agg?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
}

export interface QueryTable {
  name: string
  schema?: string
  alias?: string
}

export interface QueryJoin {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  fromTable: string
  fromField: string
  toTable: string
  toField: string
}

export interface QueryWhere {
  table?: string
  field: string
  op: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL'
  value?: string
}

export interface QueryOrderBy {
  table?: string
  field: string
  dir: 'ASC' | 'DESC'
}

export interface QueryModel {
  tables: QueryTable[]
  fields: QueryField[]
  joins?: QueryJoin[]
  where?: QueryWhere[]
  groupBy?: Array<{ table?: string; field: string }>
  orderBy?: QueryOrderBy[]
  limit?: number
  offset?: number
}

function qualify(field: string, table?: string, dialect: SqlDialect = 'postgres'): string {
  if (table) {
    return `${quoteIdentifier(table, dialect)}.${quoteIdentifier(field, dialect)}`
  }
  return quoteIdentifier(field, dialect)
}

/**
 * Builds a SELECT query string from QueryModel.
 *
 * NOTE: This is Category (b) - Query Builder generating text SQL for user review/execution.
 * Identifiers are escaped with quoteIdentifier(), values with quoteLiteral(), and keywords
 * with sqlKeyword().
 */
export function buildSelect(model: QueryModel, dialect: SqlDialect = 'postgres'): string {
  if (!model.tables || model.tables.length === 0) {
    return 'SELECT 1;'
  }

  // 1. SELECT clause
  const selectParts: string[] = []
  if (!model.fields || model.fields.length === 0) {
    selectParts.push('*')
  } else {
    for (const f of model.fields) {
      let expr = qualify(f.name, f.table, dialect)
      if (f.agg) {
        const safeAgg = sqlKeyword(f.agg, ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'] as const, 'COUNT')
        expr = `${safeAgg}(${expr})`
      }
      if (f.alias) {
        expr += ` AS ${quoteIdentifier(f.alias, dialect)}`
      }
      selectParts.push(expr)
    }
  }

  // 2. FROM clause
  const firstTable = model.tables[0]!
  let quotedFromPart = quoteIdentifier(firstTable.name, dialect)
  if (firstTable.alias) {
    quotedFromPart += ` AS ${quoteIdentifier(firstTable.alias, dialect)}`
  }

  // 3. JOINs
  const joinParts: string[] = []
  if (model.joins) {
    for (const j of model.joins) {
      const safeJoinType = sqlKeyword(j.type.toUpperCase() as 'INNER', ['INNER', 'LEFT', 'RIGHT', 'FULL'] as const, 'INNER')
      const quotedToTable = quoteIdentifier(j.toTable, dialect)
      const onClause = `${qualify(j.fromField, j.fromTable, dialect)} = ${qualify(j.toField, j.toTable, dialect)}`
      joinParts.push(`${safeJoinType} JOIN ${quotedToTable} ON ${onClause}`)
    }
  }

  // 4. WHERE
  const whereParts: string[] = []
  if (model.where && model.where.length > 0) {
    for (const w of model.where) {
      const quotedField = qualify(w.field, w.table, dialect)
      const safeOp = sqlKeyword(
        w.op,
        ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'] as const,
        '=',
      )
      if (safeOp === 'IS NULL' || safeOp === 'IS NOT NULL') {
        whereParts.push(`${quotedField} ${safeOp}`)
      } else {
        const quotedVal = w.value !== undefined ? quoteLiteral(w.value, dialect) : 'NULL'
        whereParts.push(`${quotedField} ${safeOp} ${quotedVal}`)
      }
    }
  }

  // 5. GROUP BY
  const groupParts: string[] = []
  if (model.groupBy && model.groupBy.length > 0) {
    for (const g of model.groupBy) {
      groupParts.push(qualify(g.field, g.table, dialect))
    }
  }

  // 6. ORDER BY
  const orderParts: string[] = []
  if (model.orderBy && model.orderBy.length > 0) {
    for (const o of model.orderBy) {
      const safeDir = sqlKeyword(o.dir, ['ASC', 'DESC'] as const, 'ASC')
      orderParts.push(`${qualify(o.field, o.table, dialect)} ${safeDir}`)
    }
  }

  let sql = `SELECT ${selectParts.join(', ')}\nFROM ${quotedFromPart}`
  if (joinParts.length > 0) {
    sql += `\n${joinParts.join('\n')}`
  }
  if (whereParts.length > 0) {
    sql += `\nWHERE ${whereParts.join(' AND ')}`
  }
  if (groupParts.length > 0) {
    sql += `\nGROUP BY ${groupParts.join(', ')}`
  }
  if (orderParts.length > 0) {
    sql += `\nORDER BY ${orderParts.join(', ')}`
  }
  if (model.limit !== undefined) {
    sql += `\nLIMIT ${Number(model.limit)}`
  }
  if (model.offset !== undefined) {
    sql += `\nOFFSET ${Number(model.offset)}`
  }

  return sql + ';'
}
