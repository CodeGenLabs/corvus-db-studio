import type { SqlDialect } from './dialect'

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

function quote(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/g, '``')}\``
  return `"${name.replace(/"/g, '""')}"`
}

function qualify(field: string, table?: string, dialect: SqlDialect = 'postgres'): string {
  if (table) {
    return `${quote(table, dialect)}.${quote(field, dialect)}`
  }
  return quote(field, dialect)
}

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
        expr = `${f.agg}(${expr})`
      }
      if (f.alias) {
        expr += ` AS ${quote(f.alias, dialect)}`
      }
      selectParts.push(expr)
    }
  }

  // 2. FROM clause
  const firstTable = model.tables[0]!
  let fromPart = quote(firstTable.name, dialect)
  if (firstTable.alias) {
    fromPart += ` AS ${quote(firstTable.alias, dialect)}`
  }

  // 3. JOINs
  const joinParts: string[] = []
  if (model.joins) {
    for (const j of model.joins) {
      const joinType = j.type.toUpperCase()
      const toTableQuoted = quote(j.toTable, dialect)
      const onClause = `${qualify(j.fromField, j.fromTable, dialect)} = ${qualify(j.toField, j.toTable, dialect)}`
      joinParts.push(`${joinType} JOIN ${toTableQuoted} ON ${onClause}`)
    }
  }

  // 4. WHERE
  const whereParts: string[] = []
  if (model.where && model.where.length > 0) {
    for (const w of model.where) {
      const f = qualify(w.field, w.table, dialect)
      if (w.op === 'IS NULL' || w.op === 'IS NOT NULL') {
        whereParts.push(`${f} ${w.op}`)
      } else {
        const val = w.value !== undefined ? `'${w.value.replace(/'/g, "''")}'` : 'NULL'
        whereParts.push(`${f} ${w.op} ${val}`)
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
      orderParts.push(`${qualify(o.field, o.table, dialect)} ${o.dir}`)
    }
  }

  let sql = `SELECT ${selectParts.join(', ')}\nFROM ${fromPart}`
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
    sql += `\nLIMIT ${model.limit}`
  }
  if (model.offset !== undefined) {
    sql += `\nOFFSET ${model.offset}`
  }

  return sql + ';'
}
