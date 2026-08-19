import { useQueries, useQuery } from '@tanstack/react-query'
import type { ConnectionProfile } from '@corvus/contract'
import type { Client } from '@corvus/client'

/**
 * Cây điều hướng nạp LAZY từ dữ liệu thật (SPEC-02 FR-02.02).
 *
 * Chỉ node đang mở mới sinh truy vấn: mở một connection mới gọi `introspect.databases`,
 * mở một schema mới gọi `introspect.objects`. Cây tĩnh cũ (`data/schema.ts TREE`) chỉ
 * còn dùng cho Storybook qua `transport-mock`.
 *
 * Khoá node là ĐƯỜNG DẪN đầy đủ (`conn/db/schema/table`) chứ không phải tên: hai schema
 * khác nhau có thể có bảng trùng tên, dùng tên làm khoá sẽ khiến chúng mở/đóng cùng nhau
 * — đúng lỗi của cây tĩnh cũ.
 */
export type NavKind = 'conn' | 'db' | 'schema' | 'folder' | 'table' | 'view' | 'materializedView' | 'sequence'

export interface NavRow {
  /** Đường dẫn duy nhất, cũng là khoá React và khoá của map `open`. */
  path: string
  label: string
  meta: string
  depth: number
  kind: NavKind
  /** Có thể mở rộng không (node lá thì không). */
  expandable: boolean
  open: boolean
  loading: boolean
  error?: string
  /** Ngữ cảnh để view khác biết đang chọn gì. */
  ref: { connectionId: string; database?: string; schema?: string; object?: string }
}

const OBJECT_FOLDERS = [
  { key: 'table', label: 'Tables' },
  { key: 'view', label: 'Views' },
] as const

export interface NavTreeResult {
  rows: NavRow[]
  connectionCount: number
  isLoading: boolean
  error?: string
  refetchAll(): void
}

export function useNavTree(client: Client, open: Record<string, boolean>): NavTreeResult {
  const connectionsQ = useQuery({
    queryKey: ['connections'],
    queryFn: () => client.request<ConnectionProfile[]>('connection.list', {}),
  })
  const connections = connectionsQ.data ?? []

  // ── Xác định những node đang mở để biết cần truy vấn gì ────────────────────
  const openConnections = connections.filter((c) => open[c.id])

  const dbQueries = useQueries({
    queries: openConnections.map((c) => ({
      queryKey: ['connection', c.id, 'databases'],
      queryFn: () => client.request<string[]>('introspect.databases', { connectionId: c.id }),
      // Lỗi kết nối là chuyện thường (server tắt) — không nên thử lại dồn dập.
      retry: 0,
    })),
  })

  const openDatabases: Array<{ connectionId: string; database: string }> = []
  openConnections.forEach((c, i) => {
    for (const db of dbQueries[i]?.data ?? []) {
      if (open[`${c.id}/${db}`]) openDatabases.push({ connectionId: c.id, database: db })
    }
  })

  const schemaQueries = useQueries({
    queries: openDatabases.map((d) => ({
      queryKey: ['connection', d.connectionId, 'schemas', d.database],
      queryFn: () =>
        client.request<string[]>('introspect.schemas', {
          connectionId: d.connectionId,
          database: d.database,
        }),
      retry: 0,
    })),
  })

  const openFolders: Array<{
    connectionId: string
    database: string
    schema: string
    kind: string
  }> = []
  openDatabases.forEach((d, i) => {
    for (const sc of schemaQueries[i]?.data ?? []) {
      const schemaPath = `${d.connectionId}/${d.database}/${sc}`
      if (!open[schemaPath]) continue
      for (const folder of OBJECT_FOLDERS) {
        if (open[`${schemaPath}/${folder.key}`]) {
          openFolders.push({ ...d, schema: sc, kind: folder.key })
        }
      }
    }
  })

  const objectQueries = useQueries({
    queries: openFolders.map((f) => ({
      queryKey: ['connection', f.connectionId, 'objects', f.database, f.schema, f.kind],
      queryFn: () =>
        client.request<Array<{ name: string; kind: string; rows?: string }>>('introspect.objects', {
          connectionId: f.connectionId,
          database: f.database,
          schema: f.schema,
          kind: f.kind,
        }),
      retry: 0,
    })),
  })

  // ── Làm phẳng thành danh sách dòng để render ───────────────────────────────
  const rows: NavRow[] = []

  connections.forEach((conn, ci) => {
    const connPath = conn.id
    const dbQ = openConnections.includes(conn) ? dbQueries[openConnections.indexOf(conn)] : undefined

    rows.push({
      path: connPath,
      label: conn.name,
      meta: driverLabel(conn.driverId),
      depth: 0,
      kind: 'conn',
      expandable: true,
      open: !!open[connPath],
      loading: !!dbQ?.isLoading,
      error: dbQ?.error ? messageOf(dbQ.error) : undefined,
      ref: { connectionId: conn.id },
    })
    void ci

    if (!open[connPath]) return

    for (const db of dbQ?.data ?? []) {
      const dbPath = `${conn.id}/${db}`
      const dbIndex = openDatabases.findIndex(
        (d) => d.connectionId === conn.id && d.database === db,
      )
      const schemaQ = dbIndex >= 0 ? schemaQueries[dbIndex] : undefined

      rows.push({
        path: dbPath,
        label: db,
        meta: '',
        depth: 1,
        kind: 'db',
        expandable: true,
        open: !!open[dbPath],
        loading: !!schemaQ?.isLoading,
        error: schemaQ?.error ? messageOf(schemaQ.error) : undefined,
        ref: { connectionId: conn.id, database: db },
      })

      if (!open[dbPath]) continue

      for (const sc of schemaQ?.data ?? []) {
        const schemaPath = `${dbPath}/${sc}`
        rows.push({
          path: schemaPath,
          label: sc,
          meta: '',
          depth: 2,
          kind: 'schema',
          expandable: true,
          open: !!open[schemaPath],
          loading: false,
          ref: { connectionId: conn.id, database: db, schema: sc },
        })

        if (!open[schemaPath]) continue

        for (const folder of OBJECT_FOLDERS) {
          const folderPath = `${schemaPath}/${folder.key}`
          const fIndex = openFolders.findIndex(
            (f) =>
              f.connectionId === conn.id &&
              f.database === db &&
              f.schema === sc &&
              f.kind === folder.key,
          )
          const objQ = fIndex >= 0 ? objectQueries[fIndex] : undefined

          rows.push({
            path: folderPath,
            label: folder.label,
            meta: objQ?.data ? String(objQ.data.length) : '',
            depth: 3,
            kind: 'folder',
            expandable: true,
            open: !!open[folderPath],
            loading: !!objQ?.isLoading,
            error: objQ?.error ? messageOf(objQ.error) : undefined,
            ref: { connectionId: conn.id, database: db, schema: sc },
          })

          if (!open[folderPath]) continue

          for (const obj of objQ?.data ?? []) {
            rows.push({
              path: `${folderPath}/${obj.name}`,
              label: obj.name,
              meta: obj.rows ?? '',
              depth: 4,
              kind: (obj.kind as NavKind) ?? 'table',
              expandable: false,
              open: false,
              loading: false,
              ref: { connectionId: conn.id, database: db, schema: sc, object: obj.name },
            })
          }
        }
      }
    }
  })

  return {
    rows,
    connectionCount: connections.length,
    isLoading: connectionsQ.isLoading,
    error: connectionsQ.error ? messageOf(connectionsQ.error) : undefined,
    refetchAll: () => {
      void connectionsQ.refetch()
      for (const q of [...dbQueries, ...schemaQueries, ...objectQueries]) void q.refetch()
    },
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function driverLabel(driverId: string): string {
  const LABELS: Record<string, string> = {
    postgres: 'PostgreSQL',
    mysql: 'MySQL',
    mariadb: 'MariaDB',
    sqlite: 'SQLite',
    mssql: 'SQL Server',
    oracle: 'Oracle',
    mongodb: 'MongoDB',
    redis: 'Redis',
  }
  return LABELS[driverId] ?? driverId
}
