import type { SqlDialect } from './dialect'
import { quoteIdentifier, quoteLiteral } from './dialect'

export interface RowChange {
  type: 'insert' | 'update' | 'delete'
  tableName: string
  pkColumn: string
  pkValue: string | number
  data?: Record<string, unknown>
  oldData?: Record<string, unknown>
}

function formatSqlValue(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return quoteLiteral(String(value), dialect)
}

/**
 * Orders row changes in strict safe transaction order:
 * 1. DELETEs first (free up foreign keys / unique indexes)
 * 2. UPDATEs second (with optimistic lock expected old values in WHERE)
 * 3. INSERTs last
 */
export function orderChanges(changes: RowChange[]): RowChange[] {
  const deletes = changes.filter((c) => c.type === 'delete')
  const updates = changes.filter((c) => c.type === 'update')
  const inserts = changes.filter((c) => c.type === 'insert')
  return [...deletes, ...updates, ...inserts]
}

/**
 * Generates SQL statement for an individual change with optimistic locking.
 *
 * NOTE: Category (b) - Preview / generated SQL for row data mutation review.
 * All identifiers are quoted via quoteIdentifier(), and all cell values are escaped via quoteLiteral().
 */
export function generateChangeSql(change: RowChange, dialect: SqlDialect): string {
  const quotedTable = quoteIdentifier(change.tableName, dialect)
  const quotedPk = quoteIdentifier(change.pkColumn, dialect)
  const quotedPkValue = formatSqlValue(change.pkValue, dialect)

  if (change.type === 'delete') {
    return `DELETE FROM ${quotedTable} WHERE ${quotedPk} = ${quotedPkValue};`
  }

  if (change.type === 'insert') {
    const data = change.data || {}
    const quotedCols = Object.keys(data).map((k) => quoteIdentifier(k, dialect)).join(', ')
    const quotedVals = Object.values(data).map((v) => formatSqlValue(v, dialect)).join(', ')
    return `INSERT INTO ${quotedTable} (${quotedCols}) VALUES (${quotedVals});`
  }

  // Update with optimistic locking
  const data = change.data || {}
  const oldData = change.oldData || {}

  const setClauses = Object.entries(data).map(
    ([k, v]) => `${quoteIdentifier(k, dialect)} = ${formatSqlValue(v, dialect)}`,
  )

  const whereClauses = [`${quotedPk} = ${quotedPkValue}`]
  Object.entries(oldData).forEach(([k, v]) => {
    if (k !== change.pkColumn) {
      if (v === null || v === undefined) {
        whereClauses.push(`${quoteIdentifier(k, dialect)} IS NULL`)
      } else {
        whereClauses.push(`${quoteIdentifier(k, dialect)} = ${formatSqlValue(v, dialect)}`)
      }
    }
  })

  return `UPDATE ${quotedTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`
}
