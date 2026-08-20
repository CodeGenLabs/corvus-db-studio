import type { ObjectKind } from '@corvus/contract'

export interface ObjectGroupDef {
  labelKey: string
  order: number
}

/**
 * Định nghĩa các nhóm đối tượng trên cây điều hướng.
 * Record<ObjectKind, ObjectGroupDef> buộc phủ đủ 14 loại đối tượng (Bất biến IV-D).
 */
export const OBJECT_GROUPS: Record<ObjectKind, ObjectGroupDef> = {
  table: { labelKey: 'group.tables', order: 1 },
  view: { labelKey: 'group.views', order: 2 },
  materializedView: { labelKey: 'group.materializedViews', order: 3 },
  collection: { labelKey: 'group.collections', order: 4 },
  keyspace: { labelKey: 'group.keyspaces', order: 5 },
  procedure: { labelKey: 'group.procedures', order: 6 },
  function: { labelKey: 'group.functions', order: 7 },
  package: { labelKey: 'group.packages', order: 8 },
  trigger: { labelKey: 'group.triggers', order: 9 },
  sequence: { labelKey: 'group.sequences', order: 10 },
  index: { labelKey: 'group.indexes', order: 11 },
  domain: { labelKey: 'group.domains', order: 12 },
  type: { labelKey: 'group.types', order: 13 },
  event: { labelKey: 'group.events', order: 14 },
}
