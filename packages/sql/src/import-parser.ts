import type { FieldMapping, ImportMode } from '@corvus/contract'
import type { SqlDialect } from './dialect'

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

function quote(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/g, '``')}\``
  return `"${name.replace(/"/g, '""')}"`
}

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

  const quotedTable = quote(tableName, dialect)
  const colsList = activeMappings.map((m) => quote(m.targetField, dialect)).join(', ')

  if (mode === 'copy') {
    statements.push(`DELETE FROM ${quotedTable};`)
  }

  for (const row of rows) {
    const vals = activeMappings
      .map((_m, idx) => {
        const raw = row[idx]
        if (raw === undefined || raw === '' || raw === 'NULL') return 'NULL'
        if (/^-?\d+(\.\d+)?$/.test(raw)) return raw
        return `'${raw.replace(/'/g, "''")}'`
      })
      .join(', ')

    if (mode === 'append' || mode === 'copy') {
      statements.push(`INSERT INTO ${quotedTable} (${colsList}) VALUES (${vals});`)
    } else if (mode === 'update') {
      const keyMapping = activeMappings.find((m) => m.isKey) || activeMappings[0]!
      const keyIdx = activeMappings.indexOf(keyMapping)
      const keyVal = row[keyIdx] !== undefined ? `'${row[keyIdx]?.replace(/'/g, "''")}'` : 'NULL'

      const setAssignments = activeMappings
        .filter((m) => m !== keyMapping)
        .map((m, i) => {
          const raw = row[i]
          const v = raw === undefined || raw === '' || raw === 'NULL' ? 'NULL' : `'${raw.replace(/'/g, "''")}'`
          return `${quote(m.targetField, dialect)} = ${v}`
        })
        .join(', ')

      if (setAssignments) {
        statements.push(
          `UPDATE ${quotedTable} SET ${setAssignments} WHERE ${quote(keyMapping.targetField, dialect)} = ${keyVal};`,
        )
      }
    }
  }

  return statements
}
