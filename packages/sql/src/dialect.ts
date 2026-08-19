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

/**
 * Escape một giá trị chuỗi để nhúng vào SQL dạng literal.
 *
 * CHỈ dùng khi không thể bind parameter — cụ thể là khi sinh script SQL cho người dùng
 * copy hoặc lưu ra file ("Copy as INSERT", export .sql, preview DDL). Với SQL do engine
 * THỰC THI, luôn bind parameter (security.md §7).
 */
export function quoteLiteral(value: string, dialect: SqlDialect = 'postgres'): string {
  // Nhân đôi dấu nháy đơn — quy tắc chuẩn SQL.
  let escaped = value.replace(/'/g, "''")
  // MySQL còn coi dấu gạch chéo ngược là ký tự escape trong chuỗi, nên phải nhân đôi nó.
  if (dialect === 'mysql') escaped = escaped.replace(/\\/g, '\\\\')
  return `'${escaped}'`
}
