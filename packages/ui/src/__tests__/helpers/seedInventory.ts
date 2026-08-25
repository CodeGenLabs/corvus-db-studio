import type { Client } from '@corvus/client'
import type { ObjectKind } from '@corvus/contract'

export interface SeedInventory {
  readonly engine: string
  readonly connectionId: string
  readonly databases: readonly string[]
  readonly objectsByKind: Record<ObjectKind, readonly string[]>
  readonly rowCounts: Record<string, number>
}

export async function fetchSeedInventory(
  client: Client,
  connectionId: string,
  engine: string,
  database?: string,
  schema?: string,
): Promise<SeedInventory> {
  const dbs = await client.request('introspect.databases', { connectionId })
  const databases = (dbs as Array<{ name: string }>).map((d) => d.name)

  const kinds: ObjectKind[] = ['table', 'view', 'function', 'procedure', 'trigger']
  const objectsByKind: Record<string, string[]> = {
    table: [],
    view: [],
    function: [],
    procedure: [],
    trigger: [],
    index: [],
    sequence: [],
    domain: [],
    type: [],
    event: [],
    collection: [],
    key: [],
  }

  for (const kind of kinds) {
    try {
      const objs = await client.request('introspect.objects', {
        connectionId,
        database,
        schema,
        kind,
      })
      objectsByKind[kind] = (objs as Array<{ name: string }>).map((o) => o.name)
    } catch {
      objectsByKind[kind] = []
    }
  }

  const rowCounts: Record<string, number> = {}
  for (const tableName of objectsByKind.table ?? []) {
    try {
      const res = await client.request('data.count', {
        connectionId,
        database,
        schema,
        table: tableName,
      })
      rowCounts[tableName] = (res as { count: number }).count
    } catch {
      rowCounts[tableName] = 0
    }
  }

  return {
    engine,
    connectionId,
    databases,
    objectsByKind: objectsByKind as Record<ObjectKind, readonly string[]>,
    rowCounts,
  }
}
