import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ConnectionProfile } from '@corvus/contract'
import type { Client } from '../createClient'

export function useConnectionsQuery(client: Client): UseQueryResult<ConnectionProfile[]> {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => client.request<ConnectionProfile[]>('connection.list', {}),
  })
}

export function useConnectionStatusQuery(client: Client, id: string): UseQueryResult<{ status: string; activeQueries: number; poolSize: number }> {
  return useQuery({
    queryKey: ['connection', id, 'status'],
    queryFn: () => client.request<{ status: string; activeQueries: number; poolSize: number }>('connection.status', { id }),
    enabled: Boolean(id),
  })
}
