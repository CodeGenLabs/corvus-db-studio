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

/**
 * Kiểm một từ khoá / tên access-method lấy từ catalog trước khi nhúng vào SQL.
 *
 * Có những chỗ trong DDL không thể quote và cũng không thể bind: `ON DELETE CASCADE`,
 * `USING btree`, `UNIQUE`. Giá trị tuy đến từ catalog của server chứ không từ người dùng,
 * nhưng vẫn phải đi qua allowlist — nếu tin catalog vô điều kiện thì một server bị chiếm
 * có thể trả về chuỗi tuỳ ý và ta nhúng thẳng vào DDL.
 *
 * Trả về `fallback` khi giá trị không nằm trong allowlist, thay vì ném: mục đích là sinh
 * DDL để người dùng ĐỌC, không nên vì một access-method lạ mà không hiện được gì.
 */
export function sqlKeyword<const T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Access method của index mà PostgreSQL cung cấp sẵn. */
export const PG_INDEX_METHODS = ['btree', 'hash', 'gist', 'gin', 'spgist', 'brin'] as const

/** Hành động referential của FK theo chuẩn SQL. */
export const FK_ACTIONS = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'] as const
