export type SqlDialect = 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle'

export function quoteIdentifier(identifier: string, dialect: SqlDialect = 'postgres'): string {
  // Prevent nested quotes injection
  if (dialect === 'mysql') {
    const escaped = identifier.replace(/`/g, '``')
    return `\`${escaped}\``
  }
  if (dialect === 'mssql') {
    const escaped = identifier.replace(/\]/g, ']]')
    return `[${escaped}]`
  }
  // Standard SQL quote (postgres, sqlite, oracle)
  const escaped = identifier.replace(/"/g, '""')
  return `"${escaped}"`
}

export function formatParameter(index: number, dialect: SqlDialect = 'postgres'): string {
  switch (dialect) {
    case 'postgres':
      return `$${index + 1}`
    case 'mysql':
    case 'sqlite':
      return '?'
    case 'mssql':
      return `@p${index + 1}`
    case 'oracle':
      return `:${index + 1}`
  }
}
