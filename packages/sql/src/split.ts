import type { SqlDialect } from './dialect'

export function splitStatements(sql: string, dialect: SqlDialect = 'postgres'): string[] {
  const statements: string[] = []
  let current = ''
  let i = 0
  const len = sql.length

  let inSingleQuote = false
  let inDoubleQuote = false
  let inBacktick = false
  let inLineComment = false
  let inBlockComment = false
  let inDollarQuote: string | null = null

  while (i < len) {
    const char = sql[i]!
    const nextChar = i + 1 < len ? sql[i + 1] : ''

    // 1. Handling line comments
    if (inLineComment) {
      current += char
      if (char === '\n') {
        inLineComment = false
      }
      i++
      continue
    }

    // 2. Handling block comments
    if (inBlockComment) {
      current += char
      if (char === '*' && nextChar === '/') {
        current += nextChar
        inBlockComment = false
        i += 2
        continue
      }
      i++
      continue
    }

    // 3. Handling single quotes
    if (inSingleQuote) {
      current += char
      if (char === "'") {
        if (nextChar === "'") {
          // Escaped single quote
          current += nextChar
          i += 2
          continue
        }
        inSingleQuote = false
      }
      i++
      continue
    }

    // 4. Handling double quotes
    if (inDoubleQuote) {
      current += char
      if (char === '"') {
        inDoubleQuote = false
      }
      i++
      continue
    }

    // 5. Handling MySQL backticks
    if (inBacktick) {
      current += char
      if (char === '`') {
        inBacktick = false
      }
      i++
      continue
    }

    // 6. Handling PG dollar quotes: $$ or $tag$
    if (inDollarQuote !== null) {
      current += char
      if (char === '$' && sql.startsWith(inDollarQuote, i)) {
        current += inDollarQuote.slice(1)
        i += inDollarQuote.length
        inDollarQuote = null
        continue
      }
      i++
      continue
    }

    // Check for comment starts
    if (char === '-' && nextChar === '-') {
      current += '--'
      inLineComment = true
      i += 2
      continue
    }

    if (char === '/' && nextChar === '*') {
      current += '/*'
      inBlockComment = true
      i += 2
      continue
    }

    // Check for quote starts
    if (char === "'") {
      current += char
      inSingleQuote = true
      i++
      continue
    }

    if (char === '"') {
      current += char
      inDoubleQuote = true
      i++
      continue
    }

    if (char === '`' && (dialect === 'mysql' || dialect === 'sqlite')) {
      current += char
      inBacktick = true
      i++
      continue
    }

    if (char === '$' && dialect === 'postgres') {
      // Check for dollar quote pattern $tag$ or $$
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/)
      if (match) {
        const tag = match[0]
        current += tag
        inDollarQuote = tag
        i += tag.length
        continue
      }
    }

    // Check for statement separator semicolon
    if (char === ';') {
      const trimmed = current.trim()
      if (trimmed.length > 0) {
        statements.push(trimmed)
      }
      current = ''
      i++
      continue
    }

    current += char
    i++
  }

  const trimmed = current.trim()
  if (trimmed.length > 0) {
    statements.push(trimmed)
  }

  return statements
}
