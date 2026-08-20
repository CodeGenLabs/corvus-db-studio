import type { HierarchyCapabilities } from '@corvus/contract'

export type HierarchyLevel = 'database' | 'namespace'

/**
 * Xác định các cấp phân tầng của cây điều hướng dựa trên năng lực của kết nối.
 *
 * @param caps Cấu hình phân tầng từ connection capabilities
 * @returns Mảng các cấp ('database' | 'namespace') theo thứ tự xuất hiện
 */
export function levelsOf(caps: HierarchyCapabilities): HierarchyLevel[] {
  const levels: HierarchyLevel[] = []
  if (caps.hasCatalogs) levels.push('database')
  if (caps.hasSchemas) levels.push('namespace')
  return levels
}
