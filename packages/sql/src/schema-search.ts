import type { SqlDialect } from './dialect'
import { quoteIdentifier } from './dialect'

export type SearchMode = 'structure' | 'data' | 'routine' | 'all'

export interface SchemaSearchQuery {
  term: string
  mode: SearchMode
  exactMatch?: boolean
  caseSensitive?: boolean
}

export interface SchemaSearchResult {
  type: 'table' | 'column' | 'view' | 'routine' | 'data'
  schemaName: string
  tableName?: string
  columnName?: string
  snippet: string
  matchCount?: number
}

/**
 * Builds search SQL for schema objects and data
 */
export function buildSchemaSearchSql(
  query: SchemaSearchQuery,
  schema: string,
  tables: Array<{ name: string; columns: string[] }>,
  dialect: SqlDialect,
): string[] {
  const statements: string[] = []
  const pattern = query.exactMatch ? query.term : `%${query.term}%`

  if (query.mode === 'data' || query.mode === 'all') {
    for (const tbl of tables) {
      const tableQuoted = `${quoteIdentifier(schema, dialect)}.${quoteIdentifier(tbl.name, dialect)}`
      const whereClauses = tbl.columns.map((col) => {
        const colQuoted = quoteIdentifier(col, dialect)
        if (dialect === 'postgres') {
          return `${colQuoted}::text ${query.caseSensitive ? 'LIKE' : 'ILIKE'} '${pattern}'`
        }
        return `CAST(${colQuoted} AS CHAR) LIKE '${pattern}'`
      })

      if (whereClauses.length > 0) {
        statements.push(
          `SELECT '${tbl.name}' AS table_name, count(*) AS matches FROM ${tableQuoted} WHERE ${whereClauses.join(' OR ')};`,
        )
      }
    }
  }

  return statements
}
