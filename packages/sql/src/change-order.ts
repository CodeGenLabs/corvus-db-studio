import type { SqlDialect } from './dialect'
import { quoteIdentifier } from './dialect'

export interface RowChange {
  type: 'insert' | 'update' | 'delete'
  tableName: string
  pkColumn: string
  pkValue: string | number
  data?: Record<string, unknown>
  oldData?: Record<string, unknown>
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
 * Generates SQL statement for an individual change with optimistic locking
 */
export function generateChangeSql(change: RowChange, dialect: SqlDialect): string {
  const table = quoteIdentifier(change.tableName, dialect)
  const pk = quoteIdentifier(change.pkColumn, dialect)

  if (change.type === 'delete') {
    return `DELETE FROM ${table} WHERE ${pk} = ${JSON.stringify(change.pkValue)};`
  }

  if (change.type === 'insert') {
    const data = change.data || {}
    const cols = Object.keys(data).map((k) => quoteIdentifier(k, dialect)).join(', ')
    const vals = Object.values(data).map((v) => (v === null ? 'NULL' : JSON.stringify(v))).join(', ')
    return `INSERT INTO ${table} (${cols}) VALUES (${vals});`
  }

  // Update with optimistic locking
  const data = change.data || {}
  const oldData = change.oldData || {}

  const setClauses = Object.entries(data).map(
    ([k, v]) => `${quoteIdentifier(k, dialect)} = ${v === null ? 'NULL' : JSON.stringify(v)}`,
  )

  const whereClauses = [`${pk} = ${JSON.stringify(change.pkValue)}`]
  Object.entries(oldData).forEach(([k, v]) => {
    if (k !== change.pkColumn) {
      if (v === null) {
        whereClauses.push(`${quoteIdentifier(k, dialect)} IS NULL`)
      } else {
        whereClauses.push(`${quoteIdentifier(k, dialect)} = ${JSON.stringify(v)}`)
      }
    }
  })

  return `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`
}
