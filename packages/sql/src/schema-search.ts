import type { SqlDialect } from './dialect'
import { quoteIdentifier, quoteLiteral } from './dialect'

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
 * Builds search SQL for schema objects and data.
 *
 * NOTE: Search queries generate text SQL for multi-table search execution.
 * All table/column identifiers are safely quoted with quoteIdentifier(), and all
 * literal search patterns and table names are escaped with quoteLiteral().
 */
export function buildSchemaSearchSql(
  query: SchemaSearchQuery,
  schema: string,
  tables: Array<{ name: string; columns: string[] }>,
  dialect: SqlDialect,
): string[] {
  const statements: string[] = []
  const rawPattern = query.exactMatch ? query.term : `%${query.term}%`
  const quotedPattern = quoteLiteral(rawPattern, dialect)

  if (query.mode === 'data' || query.mode === 'all') {
    for (const tbl of tables) {
      const quotedTable = `${quoteIdentifier(schema, dialect)}.${quoteIdentifier(tbl.name, dialect)}`
      const quotedTableName = quoteLiteral(tbl.name, dialect)
      const whereClauses = tbl.columns.map((col) => {
        const quotedCol = quoteIdentifier(col, dialect)
        if (dialect === 'postgres') {
          return `${quotedCol}::text ${query.caseSensitive ? 'LIKE' : 'ILIKE'} ${quotedPattern}`
        }
        return `CAST(${quotedCol} AS CHAR) LIKE ${quotedPattern}`
      })

      if (whereClauses.length > 0) {
        statements.push(
          `SELECT ${quotedTableName} AS table_name, count(*) AS matches FROM ${quotedTable} WHERE ${whereClauses.join(' OR ')};`,
        )
      }
    }
  }

  return statements
}
