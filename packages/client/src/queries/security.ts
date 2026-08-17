import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Client } from '../createClient'

export function useUsersQuery(
  client: Client,
  connectionId: string,
): UseQueryResult<Array<{ user: string; host?: string; roles: string[]; status?: string }>> {
  return useQuery({
    queryKey: ['connection', connectionId, 'security', 'users'],
    queryFn: () =>
      client.request<Array<{ user: string; host?: string; roles: string[]; status?: string }>>(
        'security.users',
        { connectionId },
      ),
    enabled: Boolean(connectionId),
  })
}
