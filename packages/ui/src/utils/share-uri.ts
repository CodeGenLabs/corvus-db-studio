export interface CorvusShareTarget {
  connectionName: string
  engine: string
  host: string
  port?: number
  database?: string
  schema?: string
  table?: string
  view?: string
}

/**
 * Encodes a connection and target object into a shareable corvus:// URI
 */
export function encodeCorvusUri(target: CorvusShareTarget): string {
  const query = new URLSearchParams()
  query.set('engine', target.engine)
  query.set('host', target.host)
  if (target.port) query.set('port', String(target.port))
  if (target.database) query.set('database', target.database)
  if (target.schema) query.set('schema', target.schema)
  if (target.table) query.set('table', target.table)
  if (target.view) query.set('view', target.view)

  return `corvus://${encodeURIComponent(target.connectionName)}?${query.toString()}`
}

/**
 * Decodes a corvus:// URI into a target object
 */
export function decodeCorvusUri(uri: string): CorvusShareTarget | null {
  if (!uri.startsWith('corvus://')) return null
  try {
    const raw = uri.slice(9)
    const [connName, queryString] = raw.split('?')
    const query = new URLSearchParams(queryString || '')

    return {
      connectionName: decodeURIComponent(connName || 'Shared Connection'),
      engine: query.get('engine') || 'mysql',
      host: query.get('host') || 'localhost',
      port: query.has('port') ? Number(query.get('port')) : undefined,
      database: query.get('database') || undefined,
      schema: query.get('schema') || undefined,
      table: query.get('table') || undefined,
      view: query.get('view') || undefined,
    }
  } catch {
    return null
  }
}
