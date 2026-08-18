export type Dialect = 'postgres' | 'mysql' | 'sqlite'

export function quoteObjectName(name: string, dialect: Dialect): string {
  if (dialect === 'mysql') {
    return `\`${name.replace(/`/g, '``')}\``
  }
  // postgres / sqlite
  return `"${name.replace(/"/g, '""')}"`
}

export function copyQuotedNameToClipboard(name: string, dialect: Dialect): Promise<void> {
  const quoted = quoteObjectName(name, dialect)
  if (navigator?.clipboard) {
    return navigator.clipboard.writeText(quoted)
  }
  return Promise.resolve()
}
