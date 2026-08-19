import type { SqlDialect } from './dialect'
import { quoteIdentifier, quoteLiteral } from './dialect'

function formatSqlValue(val: unknown, dialect: SqlDialect): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number' || typeof val === 'bigint') return String(val)
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  return quoteLiteral(String(val), dialect)
}

/**
 * Builds high-performance multi-row extended INSERT statements for MySQL/PostgreSQL/SQLite
 * e.g. INSERT INTO table (c1, c2) VALUES (1, 'a'), (2, 'b'), (3, 'c');
 *
 * NOTE: Category (b) - Fast-path batch INSERT script generation.
 * Identifiers are safely quoted with quoteIdentifier(), and literal values with quoteLiteral().
 */
export function buildExtendedInsertSql(
  tableName: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
  dialect: SqlDialect,
  batchSize = 500,
): string[] {
  if (rows.length === 0 || columns.length === 0) return []

  const quotedTable = quoteIdentifier(tableName, dialect)
  const quotedCols = columns.map((c) => quoteIdentifier(c, dialect)).join(', ')

  const batches: string[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batchRows = rows.slice(i, i + batchSize)
    const valuesList = batchRows.map((row) => {
      const rowVals = columns.map((col) => {
        const val = row[col]
        return formatSqlValue(val, dialect)
      })
      return `(${rowVals.join(', ')})`
    })

    batches.push(`INSERT INTO ${quotedTable} (${quotedCols}) VALUES\n  ${valuesList.join(',\n  ')};`)
  }

  return batches
}

/**
 * Builds PostgreSQL COPY FROM STDIN statement
 */
export function buildPgCopyStdinHeader(tableName: string, columns: string[]): string {
  const quotedCols = columns.map((c) => quoteIdentifier(c, 'postgres')).join(', ')
  const quotedTable = quoteIdentifier(tableName, 'postgres')
  return `COPY ${quotedTable} (${quotedCols}) FROM stdin WITH (FORMAT csv, HEADER false);`
}
