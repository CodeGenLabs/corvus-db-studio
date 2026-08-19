import type { SqlDialect } from './dialect'
import { quoteIdentifier } from './dialect'

export interface SubquerySpec {
  alias: string
  rawSql?: string
  innerQuery?: {
    select: string[]
    from: string
    where?: string
  }
}

export class SubqueryBuilder {
  public static buildFromSubquery(subquery: SubquerySpec, dialect: SqlDialect = 'postgres'): string {
    let inner = subquery.rawSql || ''
    if (subquery.innerQuery) {
      const safeSelect = subquery.innerQuery.select.join(', ')
      const safeWhere = subquery.innerQuery.where ? ' WHERE ' + subquery.innerQuery.where : ''
      const quotedFrom =
        subquery.innerQuery.from.includes(' ') ||
        subquery.innerQuery.from.includes('.') ||
        subquery.innerQuery.from.startsWith('"') ||
        subquery.innerQuery.from.startsWith('`')
          ? subquery.innerQuery.from
          : quoteIdentifier(subquery.innerQuery.from, dialect)
      inner = `SELECT ${safeSelect} FROM ${quotedFrom}${safeWhere}`
    }

    const quotedAlias = quoteIdentifier(subquery.alias, dialect)
    return `(${inner}) AS ${quotedAlias}`
  }

  public static buildWhereInSubquery(column: string, subquerySql: string, dialect: SqlDialect = 'postgres'): string {
    const quotedColumn =
      column.includes('.') || column.startsWith('"') || column.startsWith('`') || column.startsWith('[')
        ? column
        : quoteIdentifier(column, dialect)
    return `${quotedColumn} IN (${subquerySql})`
  }

  public static buildWhereExistsSubquery(subquerySql: string, notExists = false): string {
    return `${notExists ? 'NOT EXISTS' : 'EXISTS'} (${subquerySql})`
  }
}
