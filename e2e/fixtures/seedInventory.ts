import type { ObjectKind } from '@corvus/contract'

export interface E2ESeedInventory {
  readonly engine: string
  readonly connectionId: string
  readonly databases: readonly string[]
  readonly objectsByKind: Record<ObjectKind, readonly string[]>
  readonly rowCounts: Record<string, number>
}

export const EXPECTED_SEED_DATA = {
  postgres: {
    database: 'corvus_dev',
    schema: 'public',
    tables: ['users', 'products', 'orders', 'order_items', 'audit_logs'],
  },
  mysql: {
    database: 'corvus_dev',
    tables: ['users', 'products', 'orders', 'order_items', 'audit_logs'],
  },
  sqlite: {
    database: 'main',
    tables: ['users', 'products', 'orders', 'order_items', 'audit_logs'],
  },
}
