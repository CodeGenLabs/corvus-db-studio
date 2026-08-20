import type {
  ColumnMeta,
  TableMeta,
} from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import type Redis from 'ioredis'

export class RedisIntrospector implements Introspector {
  constructor(private readonly redis: Redis) {}

  async listDatabases(): Promise<string[]> {
    // Redis mặc định có 16 databases từ db0 đến db15
    return Array.from({ length: 16 }, (_, i) => `db${i}`)
  }

  async listSchemas(): Promise<string[]> {
    return []
  }

  /**
   * Liệt kê keys bằng SCAN theo lô (SPEC-13 FR-13.17 / driver-roadmap.md).
   * TUYỆT ĐỐI KHÔNG DÙNG `KEYS *` trên production.
   */
  async listObjects(opts: {
    database?: string
    schema?: string
    kind?: string
  }): Promise<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>> {
    const objects: Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }> = []
    let cursor = '0'
    const limit = 200 // Giới hạn lấy mẫu ban đầu để hiển thị nhanh

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'COUNT', 50)
      cursor = nextCursor

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline()
        for (const key of keys) {
          pipeline.type(key)
        }
        const types = await pipeline.exec()

        for (let i = 0; i < keys.length; i++) {
          const keyName = keys[i]
          if (!keyName) continue
          const keyType = (types?.[i]?.[1] as string) ?? 'string'

          if (!opts.kind || opts.kind === 'keyspace' || opts.kind === keyType) {
            objects.push({
              name: keyName,
              kind: 'keyspace',
            })
          }
        }
      }

      if (objects.length >= limit) {
        break
      }
    } while (cursor !== '0')

    return objects
  }

  async getTableMeta(opts: {
    database?: string
    schema?: string
    table: string
  }): Promise<TableMeta> {
    const keyName = opts.table
    const keyType = await this.redis.type(keyName)
    const ttl = await this.redis.ttl(keyName)

    let memoryUsage: number | undefined
    try {
      const mem = await this.redis.memory('USAGE', keyName)
      if (typeof mem === 'number') memoryUsage = mem
    } catch {
      // ignore
    }

    const columns: ColumnMeta[] = [
      {
        name: 'key',
        dataType: 'string',
        nullable: false,
        isPrimaryKey: true,
        ordinalPosition: 1,
      },
      {
        name: 'type',
        dataType: keyType,
        nullable: false,
        isPrimaryKey: false,
        defaultValue: keyType,
        ordinalPosition: 2,
      },
      {
        name: 'ttl',
        dataType: 'integer',
        nullable: false,
        isPrimaryKey: false,
        defaultValue: String(ttl),
        ordinalPosition: 3,
      },
    ]

    return {
      name: keyName,
      columns,
      indexes: [],
      foreignKeys: [],
      sizeBytes: memoryUsage,
      comment: `Redis Key (Type: ${keyType}, TTL: ${ttl}s)`,
    }
  }

  async getDdl(opts: {
    database?: string
    schema?: string
    name: string
    kind: string
  }): Promise<string> {
    const keyName = opts.name
    const keyType = await this.redis.type(keyName)
    const ttl = await this.redis.ttl(keyName)
    return `// Redis Key: ${keyName}\n// Type: ${keyType}\n// TTL: ${ttl >= 0 ? `${ttl}s` : 'No Expiry'}`
  }
}
