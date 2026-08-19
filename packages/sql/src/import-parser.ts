import type { FieldMapping, ImportMode } from '@corvus/contract'
import type { SqlDialect } from './dialect'
import { quoteIdentifier, quoteLiteral } from './dialect'

export function parseDelimited(
  text: string,
  delimiter = ',',
  qualifier = '"',
): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  let i = 0
  const len = text.length

  while (i < len) {
    const char = text[i]!
    const nextChar = i + 1 < len ? text[i + 1] : ''

    if (inQuotes) {
      if (char === qualifier) {
        if (nextChar === qualifier) {
          currentField += qualifier
          i += 2
          continue
        } else {
          inQuotes = false
          i++
          continue
        }
      }
      currentField += char
      i++
      continue
    }

    if (char === qualifier) {
      inQuotes = true
      i++
      continue
    }

    if (char === delimiter) {
      currentRow.push(currentField.trim())
      currentField = ''
      i++
      continue
    }

    if (char === '\r') {
      if (nextChar === '\n') i++
      currentRow.push(currentField.trim())
      if (currentRow.length > 0 && currentRow.some((c) => c !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      i++
      continue
    }

    if (char === '\n') {
      currentRow.push(currentField.trim())
      if (currentRow.length > 0 && currentRow.some((c) => c !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
      i++
      continue
    }

    currentField += char
    i++
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
}

export function inferColumnType(samples: string[]): string {
  const nonEmpties = samples.filter((s) => s !== '' && s !== 'NULL' && s !== undefined)
  if (nonEmpties.length === 0) return 'VARCHAR(255)'

  const isAllInt = nonEmpties.every((s) => /^-?\d+$/.test(s))
  if (isAllInt) return 'INT'

  const isAllNum = nonEmpties.every((s) => /^-?\d+(\.\d+)?$/.test(s))
  if (isAllNum) return 'DECIMAL(10,2)'

  const isAllBool = nonEmpties.every((s) =>
    ['true', 'false', '0', '1', 'yes', 'no'].includes(s.toLowerCase()),
  )
  if (isAllBool) return 'BOOLEAN'

  const isAllDate = nonEmpties.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
  if (isAllDate) return 'DATE'

  const isAllTimestamp = nonEmpties.every((s) =>
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s),
  )
  if (isAllTimestamp) return 'TIMESTAMP'

  const maxLen = Math.max(...nonEmpties.map((s) => s.length))
  if (maxLen <= 50) return 'VARCHAR(50)'
  if (maxLen <= 255) return 'VARCHAR(255)'
  return 'TEXT'
}

function formatSqlValue(raw: string | undefined, dialect: SqlDialect): string {
  if (raw === undefined || raw === '' || raw === 'NULL') return 'NULL'
  if (/^-?\d+(\.\d+)?$/.test(raw)) return raw
  return quoteLiteral(raw, dialect)
}

/**
 * Generates SQL statements for file import.
 *
 * NOTE: Category (b) - Import wizard SQL statements generated for preview / execution script.
 * Table and column names are quoted with quoteIdentifier(), and field values with quoteLiteral().
 */
export function generateImportSql(
  tableName: string,
  mappings: FieldMapping[],
  rows: string[][],
  mode: ImportMode = 'append',
  dialect: SqlDialect = 'postgres',
): string[] {
  const statements: string[] = []
  const activeMappings = mappings.filter((m) => !m.ignored)
  if (activeMappings.length === 0 || rows.length === 0) return statements

  const quotedTable = quoteIdentifier(tableName, dialect)
  const quotedColsList = activeMappings.map((m) => quoteIdentifier(m.targetField, dialect)).join(', ')

  if (mode === 'copy') {
    statements.push(`DELETE FROM ${quotedTable};`)
  }

  for (const row of rows) {
    const quotedVals = activeMappings
      .map((_m, idx) => {
        const raw = row[idx]
        return formatSqlValue(raw, dialect)
      })
      .join(', ')

    if (mode === 'append' || mode === 'copy') {
      statements.push(`INSERT INTO ${quotedTable} (${quotedColsList}) VALUES (${quotedVals});`)
    } else if (mode === 'update') {
      const keyMapping = activeMappings.find((m) => m.isKey) || activeMappings[0]!
      const keyIdx = activeMappings.indexOf(keyMapping)
      const quotedKeyVal = formatSqlValue(row[keyIdx], dialect)
      const quotedKeyCol = quoteIdentifier(keyMapping.targetField, dialect)

      const safeSetAssignments = activeMappings
        .filter((m) => m !== keyMapping)
        .map((m, i) => {
          const raw = row[i]
          const v = formatSqlValue(raw, dialect)
          return `${quoteIdentifier(m.targetField, dialect)} = ${v}`
        })
        .join(', ')

      if (safeSetAssignments) {
        statements.push(
          `UPDATE ${quotedTable} SET ${safeSetAssignments} WHERE ${quotedKeyCol} = ${quotedKeyVal};`,
        )
      }
    }
  }

  return statements
}
