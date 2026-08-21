import { useQueries, useQuery } from '@tanstack/react-query'
import type { CapabilitySet, ConnectionProfile, ObjectKind } from '@corvus/contract'
import type { Client } from '@corvus/client'
import { levelsOf } from '../navigation/levels'
import { OBJECT_GROUPS } from '../navigation/objectGroups'

export type NavNodeLevel = 'connection' | 'database' | 'namespace' | 'group' | 'object'
export type NavNodeState = 'collapsed' | 'loading' | 'expanded' | 'error'

export interface NavRow {
  /** Đường dẫn duy nhất, cũng là khoá React và khoá của map `open`. */
  path: string
  label: string
  meta: string
  depth: number
  level: NavNodeLevel
  kind: string
  objectKind?: ObjectKind
  expandable: boolean
  open: boolean
  loading: boolean
  error?: string
  /** Ngữ cảnh để view khác biết đang chọn gì (Bất biến IV-B). */
  ref: {
    connectionId: string
    database?: string
    namespace?: string
    objectKind?: ObjectKind
    object?: string
  }
}

export interface NavTreeResult {
  rows: NavRow[]
  connectionCount: number
  isLoading: boolean
  error?: string
  refetchAll(): void
}

/** Nhãn mặc định của driver cho badge */
const DRIVER_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlite: 'SQLite',
  mssql: 'SQL Server',
  oracle: 'Oracle',
  mongodb: 'MongoDB',
  redis: 'Redis',
}

export function useNavTree(
  client: Client,
  open: Record<string, boolean>,
  dict?: Record<string, string>,
): NavTreeResult {
  // ── 1. Danh sách kết nối cấp 1 (FR-001 / US1) ──────────────────────────────
  const connectionsQ = useQuery({
    queryKey: ['connections'],
    queryFn: () => client.request<ConnectionProfile[]>('connection.list', {}),
  })
  const connections = connectionsQ.data ?? []

  // ── 2. Capabilities của các kết nối đang mở ────────────────────────────────
  const openConnections = connections.filter((c) => open[c.id])

  const openConnQueries = useQueries({
    queries: openConnections.map((c) => ({
      queryKey: ['connection', c.id, 'open'],
      queryFn: async () => {
        const res = await client.request<{ capabilities: CapabilitySet }>('connection.open', {
          id: c.id,
        })
        return res.capabilities
      },
      retry: 0,
      staleTime: 5 * 60_000,
    })),
  })

  // ── 3. Danh sách Databases cho các kết nối có catalogs ─────────────────────
  const dbQueryTargets: Array<{ conn: ConnectionProfile; caps?: CapabilitySet }> = []
  openConnections.forEach((c, idx) => {
    const caps = openConnQueries[idx]?.data
    // Nếu chưa load xong caps thì vẫn query databases theo mặc định an toàn
    const hasCatalogs = caps?.hierarchy ? caps.hierarchy.hasCatalogs : true
    if (hasCatalogs) {
      dbQueryTargets.push({ conn: c, caps })
    }
  })

  const dbQueries = useQueries({
    queries: dbQueryTargets.map(({ conn }) => ({
      queryKey: ['connection', conn.id, 'databases'],
      queryFn: () => client.request<string[]>('introspect.databases', { connectionId: conn.id }),
      retry: 0,
    })),
  })

  // ── 4. Danh sách Schemas (Namespaces) cho các database đang mở ─────────────
  interface OpenDbTarget {
    conn: ConnectionProfile
    database: string
    caps?: CapabilitySet
  }
  const openDatabases: OpenDbTarget[] = []

  openConnections.forEach((conn, ci) => {
    const caps = openConnQueries[ci]?.data
    const levels = caps?.hierarchy ? levelsOf(caps.hierarchy) : ['database', 'namespace']

    if (levels.includes('database')) {
      const dbTargetIdx = dbQueryTargets.findIndex((t) => t.conn.id === conn.id)
      const dbs = dbTargetIdx >= 0 ? dbQueries[dbTargetIdx]?.data ?? [] : []
      for (const db of dbs) {
        if (open[`${conn.id}/${db}`]) {
          openDatabases.push({ conn, database: db, caps })
        }
      }
    }
  })

  const schemaQueryTargets = openDatabases.filter(({ caps }) => {
    const levels = caps?.hierarchy ? levelsOf(caps.hierarchy) : ['database', 'namespace']
    return levels.includes('namespace')
  })

  const schemaQueries = useQueries({
    queries: schemaQueryTargets.map((d) => ({
      queryKey: ['connection', d.conn.id, 'schemas', d.database],
      queryFn: () =>
        client.request<string[]>('introspect.schemas', {
          connectionId: d.conn.id,
          database: d.database,
        }),
      retry: 0,
    })),
  })

  // ── 5. Danh sách Object Groups đang mở ──────────────────────────────────────
  interface OpenFolderTarget {
    conn: ConnectionProfile
    database?: string
    namespace?: string
    kind: ObjectKind
    folderPath: string
  }
  const openFolders: OpenFolderTarget[] = []

  openConnections.forEach((conn, ci) => {
    const caps = openConnQueries[ci]?.data
    const levels = caps?.hierarchy ? levelsOf(caps.hierarchy) : ['database', 'namespace']
    const supportedKinds = caps?.objects
      ? (Object.keys(caps.objects) as ObjectKind[]).filter((k) => caps.objects[k])
      : (['table', 'view'] as ObjectKind[])

    if (levels.includes('database') && levels.includes('namespace')) {
      // 3 cấp: conn › db › schema › group › object
      const dbTargetIdx = dbQueryTargets.findIndex((t) => t.conn.id === conn.id)
      const dbs = dbTargetIdx >= 0 ? dbQueries[dbTargetIdx]?.data ?? [] : []
      for (const db of dbs) {
        const dbPath = `${conn.id}/${db}`
        if (!open[dbPath]) continue

        const sTargetIdx = schemaQueryTargets.findIndex(
          (t) => t.conn.id === conn.id && t.database === db,
        )
        const schemas = sTargetIdx >= 0 ? schemaQueries[sTargetIdx]?.data ?? [] : []
        for (const sc of schemas) {
          const schemaPath = `${dbPath}/${sc}`
          if (!open[schemaPath]) continue

          for (const kind of supportedKinds) {
            const folderPath = `${schemaPath}/${kind}`
            if (open[folderPath]) {
              openFolders.push({ conn, database: db, namespace: sc, kind, folderPath })
            }
          }
        }
      }
    } else if (levels.includes('database') && !levels.includes('namespace')) {
      // 2 cấp: conn › db › group › object (MySQL, SQLite attach, Redis)
      const dbTargetIdx = dbQueryTargets.findIndex((t) => t.conn.id === conn.id)
      const dbs = dbTargetIdx >= 0 ? dbQueries[dbTargetIdx]?.data ?? [] : []
      for (const db of dbs) {
        const dbPath = `${conn.id}/${db}`
        if (!open[dbPath]) continue

        for (const kind of supportedKinds) {
          const folderPath = `${dbPath}/${kind}`
          if (open[folderPath]) {
            openFolders.push({ conn, database: db, kind, folderPath })
          }
        }
      }
    } else if (!levels.includes('database') && levels.includes('namespace')) {
      // 2 cấp: conn › schema › group › object (Oracle)
      const schemas = schemaQueries[0]?.data ?? []
      for (const sc of schemas) {
        const schemaPath = `${conn.id}/${sc}`
        if (!open[schemaPath]) continue

        for (const kind of supportedKinds) {
          const folderPath = `${schemaPath}/${kind}`
          if (open[folderPath]) {
            openFolders.push({ conn, namespace: sc, kind, folderPath })
          }
        }
      }
    } else {
      // 1 cấp: conn › group › object (Flat SQLite)
      for (const kind of supportedKinds) {
        const folderPath = `${conn.id}/${kind}`
        if (open[folderPath]) {
          openFolders.push({ conn, kind, folderPath })
        }
      }
    }
  })

  const objectQueries = useQueries({
    queries: openFolders.map((f) => ({
      queryKey: ['connection', f.conn.id, 'objects', f.database, f.namespace, f.kind],
      queryFn: () =>
        client.request<Array<{ name: string; kind: string; rows?: string }>>('introspect.objects', {
          connectionId: f.conn.id,
          database: f.database,
          schema: f.namespace,
          kind: f.kind,
        }),
      retry: 0,
    })),
  })

  // ── 6. Dựng danh sách phẳng NavRow (Bất biến IV-B / IV-C) ───────────────────
  const rows: NavRow[] = []

  connections.forEach((conn) => {
    const connPath = conn.id
    const isConnOpen = !!open[connPath]
    const openConnIdx = openConnections.indexOf(conn)
    const connOpenQ = openConnIdx >= 0 ? openConnQueries[openConnIdx] : undefined
    const caps = connOpenQ?.data
    const levels = caps?.hierarchy ? levelsOf(caps.hierarchy) : ['database', 'namespace']

    const dbTargetIdx = dbQueryTargets.findIndex((t) => t.conn.id === conn.id)
    const dbQ = dbTargetIdx >= 0 ? dbQueries[dbTargetIdx] : undefined

    rows.push({
      path: connPath,
      label: conn.name,
      meta: DRIVER_LABELS[conn.driverId] ?? conn.driverId,
      depth: 0,
      level: 'connection',
      kind: 'conn',
      expandable: true,
      open: isConnOpen,
      loading: !!connOpenQ?.isLoading || !!(levels.includes('database') && dbQ?.isLoading),
      error: connOpenQ?.error ? messageOf(connOpenQ.error) : dbQ?.error ? messageOf(dbQ.error) : undefined,
      ref: { connectionId: conn.id },
    })

    if (!isConnOpen) return

    // Sắp xếp các nhóm đối tượng theo order
    const supportedGroupDefs = (Object.keys(OBJECT_GROUPS) as ObjectKind[])
      .filter((k) => (caps?.objects ? caps.objects[k] : k === 'table' || k === 'view'))
      .sort((a, b) => OBJECT_GROUPS[a].order - OBJECT_GROUPS[b].order)

    const renderFolder = (
      folderPath: string,
      kind: ObjectKind,
      depth: number,
      contextRef: { database?: string; namespace?: string },
    ) => {
      const fIdx = openFolders.findIndex((f) => f.folderPath === folderPath)
      const objQ = fIdx >= 0 ? objectQueries[fIdx] : undefined
      const isFolderOpen = !!open[folderPath]
      const label = dict?.[OBJECT_GROUPS[kind].labelKey] ?? OBJECT_GROUPS[kind].labelKey.replace('group.', '')

      rows.push({
        path: folderPath,
        label,
        meta: objQ?.data ? String(objQ.data.length) : '',
        depth,
        level: 'group',
        kind: 'folder',
        objectKind: kind,
        expandable: true,
        open: isFolderOpen,
        loading: !!objQ?.isLoading,
        error: objQ?.error ? messageOf(objQ.error) : undefined,
        ref: { connectionId: conn.id, ...contextRef, objectKind: kind },
      })

      if (!isFolderOpen) return

      for (const obj of objQ?.data ?? []) {
        rows.push({
          path: `${folderPath}/${obj.name}`,
          label: obj.name,
          meta: obj.rows ?? '',
          depth: depth + 1,
          level: 'object',
          kind: obj.kind || kind,
          objectKind: (obj.kind as ObjectKind) || kind,
          expandable: false,
          open: false,
          loading: false,
          ref: {
            connectionId: conn.id,
            ...contextRef,
            objectKind: (obj.kind as ObjectKind) || kind,
            object: obj.name,
          },
        })
      }
    }

    if (levels.includes('database') && levels.includes('namespace')) {
      for (const db of dbQ?.data ?? []) {
        const dbPath = `${conn.id}/${db}`
        const isDbOpen = !!open[dbPath]
        const sTargetIdx = schemaQueryTargets.findIndex(
          (t) => t.conn.id === conn.id && t.database === db,
        )
        const schemaQ = sTargetIdx >= 0 ? schemaQueries[sTargetIdx] : undefined

        rows.push({
          path: dbPath,
          label: db,
          meta: '',
          depth: 1,
          level: 'database',
          kind: 'db',
          expandable: true,
          open: isDbOpen,
          loading: !!schemaQ?.isLoading,
          error: schemaQ?.error ? messageOf(schemaQ.error) : undefined,
          ref: { connectionId: conn.id, database: db },
        })

        if (!isDbOpen) continue

        for (const sc of schemaQ?.data ?? []) {
          const schemaPath = `${dbPath}/${sc}`
          const isSchemaOpen = !!open[schemaPath]

          rows.push({
            path: schemaPath,
            label: sc,
            meta: '',
            depth: 2,
            level: 'namespace',
            kind: 'schema',
            expandable: true,
            open: isSchemaOpen,
            loading: false,
            ref: { connectionId: conn.id, database: db, namespace: sc },
          })

          if (!isSchemaOpen) continue

          for (const kind of supportedGroupDefs) {
            renderFolder(`${schemaPath}/${kind}`, kind, 3, { database: db, namespace: sc })
          }
        }
      }
    } else if (levels.includes('database') && !levels.includes('namespace')) {
      for (const db of dbQ?.data ?? []) {
        const dbPath = `${conn.id}/${db}`
        const isDbOpen = !!open[dbPath]

        rows.push({
          path: dbPath,
          label: db,
          meta: '',
          depth: 1,
          level: 'database',
          kind: 'db',
          expandable: true,
          open: isDbOpen,
          loading: false,
          ref: { connectionId: conn.id, database: db },
        })

        if (!isDbOpen) continue

        for (const kind of supportedGroupDefs) {
          renderFolder(`${dbPath}/${kind}`, kind, 2, { database: db })
        }
      }
    } else if (!levels.includes('database') && levels.includes('namespace')) {
      const sQ = schemaQueries[0]
      for (const sc of sQ?.data ?? []) {
        const schemaPath = `${conn.id}/${sc}`
        const isSchemaOpen = !!open[schemaPath]

        rows.push({
          path: schemaPath,
          label: sc,
          meta: '',
          depth: 1,
          level: 'namespace',
          kind: 'schema',
          expandable: true,
          open: isSchemaOpen,
          loading: false,
          ref: { connectionId: conn.id, namespace: sc },
        })

        if (!isSchemaOpen) continue

        for (const kind of supportedGroupDefs) {
          renderFolder(`${schemaPath}/${kind}`, kind, 2, { namespace: sc })
        }
      }
    } else {
      for (const kind of supportedGroupDefs) {
        renderFolder(`${conn.id}/${kind}`, kind, 1, {})
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
      for (const q of [...openConnQueries, ...dbQueries, ...schemaQueries, ...objectQueries]) {
        void q.refetch()
      }
    },
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
