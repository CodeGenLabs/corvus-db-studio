import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { TableMeta } from '@corvus/contract'
import type { Client } from '../createClient'

export function useDatabasesQuery(client: Client, connectionId: string): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ['connection', connectionId, 'databases'],
    queryFn: () => client.request<string[]>('introspect.databases', { connectionId }),
    enabled: Boolean(connectionId),
  })
}

export function useObjectsQuery(
  client: Client,
  connectionId: string,
  schema?: string,
  kind?: string,
): UseQueryResult<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>> {
  return useQuery({
    queryKey: ['connection', connectionId, 'schema', schema, 'objects', kind],
    queryFn: () =>
      client.request<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>>(
        'introspect.objects',
        { connectionId, schema, kind },
      ),
    enabled: Boolean(connectionId),
  })
}

export function useTableMetaQuery(
  client: Client,
  connectionId: string,
  table: string,
  schema?: string,
): UseQueryResult<TableMeta> {
  return useQuery({
    queryKey: ['connection', connectionId, 'table', schema, table, 'meta'],
    queryFn: () =>
      client.request<TableMeta>('introspect.tableMeta', { connectionId, table, schema }),
    enabled: Boolean(connectionId && table),
  })
}
