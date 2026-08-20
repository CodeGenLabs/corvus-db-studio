import type {
  ColumnMeta,
  IndexMeta,
  TableMeta,
} from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import type { MongoClient } from 'mongodb'

export class MongoIntrospector implements Introspector {
  constructor(private readonly client: MongoClient) {}

  async listDatabases(): Promise<string[]> {
    const admin = this.client.db('admin').admin()
    const res = await admin.listDatabases()
    return res.databases
      .map((d) => d.name)
      .filter((name) => name !== 'admin' && name !== 'local' && name !== 'config')
  }

  async listSchemas(): Promise<string[]> {
    return []
  }

  async listObjects(opts: {
    database?: string
    schema?: string
    kind?: string
  }): Promise<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>> {
    const dbName = opts.database ?? 'test'
    const db = this.client.db(dbName)
    const collections = await db.listCollections().toArray()

    const objects: Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }> = []

    for (const col of collections) {
      const isView = col.type === 'view'
      if (opts.kind && opts.kind !== (isView ? 'view' : 'collection')) {
        continue
      }

      let countStr: string | undefined
      try {
        const count = await db.collection(col.name).estimatedDocumentCount()
        countStr = String(count)
      } catch {
        // ignore
      }

      objects.push({
        name: col.name,
        kind: isView ? 'view' : 'collection',
        rows: countStr,
      })
    }

    return objects
  }

  async getTableMeta(opts: {
    database?: string
    schema?: string
    table: string
  }): Promise<TableMeta> {
    const dbName = opts.database ?? 'test'
    const col = this.client.db(dbName).collection(opts.table)

    // Lấy mẫu 50 documents để suy luận cấu trúc các trường (SPEC-13 FR-13.14)
    const sampleDocs = await col.aggregate([{ $sample: { size: 50 } }]).toArray()

    const fieldMap = new Map<string, { type: string; nullable: boolean; isPk: boolean }>()
    fieldMap.set('_id', { type: 'ObjectId', nullable: false, isPk: true })

    for (const doc of sampleDocs) {
      for (const [key, val] of Object.entries(doc)) {
        if (key === '_id') continue
        const typeName = val === null ? 'null' : Array.isArray(val) ? 'Array' : typeof val === 'object' ? (val?.constructor?.name ?? 'Object') : typeof val
        if (!fieldMap.has(key)) {
          fieldMap.set(key, { type: typeName, nullable: true, isPk: false })
        }
      }
    }

    let ordinal = 1
    const columns: ColumnMeta[] = Array.from(fieldMap.entries()).map(([name, info]) => ({
      name,
      dataType: info.type,
      nullable: info.nullable,
      isPrimaryKey: info.isPk,
      ordinalPosition: ordinal++,
    }))

    // ── Indexes ──────────────────────────────────────────────────────────────
    let indexes: IndexMeta[] = []
    try {
      const rawIndexes = await col.indexes()
      indexes = rawIndexes.map((idx) => ({
        name: idx.name ?? 'index',
        columns: Object.keys(idx.key ?? {}),
        unique: Boolean(idx.unique),
        primary: idx.name === '_id_',
      }))
    } catch {
      // ignore
    }

    let rowCount: number | undefined
    try {
      rowCount = await col.estimatedDocumentCount()
    } catch {
      // ignore
    }

    return {
      name: opts.table,
      columns,
      indexes,
      foreignKeys: [],
      rowCount,
      comment: 'Schema suy luận từ lấy mẫu document ngẫu nhiên',
    }
  }

  async getDdl(opts: {
    database?: string
    schema?: string
    name: string
    kind: string
  }): Promise<string> {
    const meta = await this.getTableMeta({
      database: opts.database,
      table: opts.name,
    })

    const sampleFields = meta.columns.map((c) => `  "${c.name}": "${c.dataType}"${c.isPrimaryKey ? ' (Primary Key)' : ''}`).join(',\n')
    return `// MongoDB Collection: ${opts.name}\n// Schema suy luận từ lấy mẫu 50 document ngẫu nhiên:\n{\n${sampleFields}\n}`
  }
}
