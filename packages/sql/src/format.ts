export function formatSql(sql: string): string {
  const keywords = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'INNER JOIN',
    'FULL JOIN',
    'CROSS JOIN',
    'INSERT INTO',
    'VALUES',
    'UPDATE',
    'SET',
    'DELETE FROM',
    'CREATE TABLE',
    'ALTER TABLE',
    'DROP TABLE',
    'UNION',
    'UNION ALL',
  ]

  let formatted = sql.replace(/\s+/g, ' ').trim()

  for (const kw of keywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi')
    formatted = formatted.replace(regex, `\n${kw}`)
  }

  return formatted
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

export function minifySql(sql: string): string {
  return sql
    .replace(/--.*$/gm, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}
