import type { SqlDialect } from './dialect'
import { quoteIdentifier } from './dialect'

/**
 * Builds high-performance multi-row extended INSERT statements for MySQL/PostgreSQL/SQLite
 * e.g. INSERT INTO table (c1, c2) VALUES (1, 'a'), (2, 'b'), (3, 'c');
 */
export function buildExtendedInsertSql(
  tableName: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
  dialect: SqlDialect,
  batchSize = 500,
): string[] {
  if (rows.length === 0 || columns.length === 0) return []

  const tableQuoted = quoteIdentifier(tableName, dialect)
  const colsQuoted = columns.map((c) => quoteIdentifier(c, dialect)).join(', ')

  const batches: string[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batchRows = rows.slice(i, i + batchSize)
    const valuesList = batchRows.map((row) => {
      const rowVals = columns.map((col) => {
        const val = row[col]
        if (val === null || val === undefined) return 'NULL'
        if (typeof val === 'number' || typeof val === 'bigint') return String(val)
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
        return JSON.stringify(val)
      })
      return `(${rowVals.join(', ')})`
    })

    batches.push(`INSERT INTO ${tableQuoted} (${colsQuoted}) VALUES\n  ${valuesList.join(',\n  ')};`)
  }

  return batches
}

/**
 * Builds PostgreSQL COPY FROM STDIN statement
 */
export function buildPgCopyStdinHeader(tableName: string, columns: string[]): string {
  const colsQuoted = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ')
  return `COPY "${tableName.replace(/"/g, '""')}" (${colsQuoted}) FROM stdin WITH (FORMAT csv, HEADER false);`
}
