import type { SqlDialect } from './dialect'

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
  public static buildFromSubquery(subquery: SubquerySpec, dialect: SqlDialect): string {
    let inner = subquery.rawSql || ''
    if (subquery.innerQuery) {
      const select = subquery.innerQuery.select.join(', ')
      const where = subquery.innerQuery.where ? ` WHERE ${subquery.innerQuery.where}` : ''
      inner = `SELECT ${select} FROM ${subquery.innerQuery.from}${where}`
    }

    if (dialect === 'mysql') {
      return `(${inner}) AS \`${subquery.alias}\``
    }
    return `(${inner}) AS "${subquery.alias}"`
  }

  public static buildWhereInSubquery(column: string, subquerySql: string): string {
    return `${column} IN (${subquerySql})`
  }

  public static buildWhereExistsSubquery(subquerySql: string, notExists = false): string {
    return `${notExists ? 'NOT EXISTS' : 'EXISTS'} (${subquerySql})`
  }
}
