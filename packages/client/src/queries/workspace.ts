import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Config } from '@corvus/contract'
import type { Client } from '../createClient'

export function useSettingsQuery(client: Client): UseQueryResult<Config> {
  return useQuery({
    queryKey: ['workspace', 'settings'],
    queryFn: () => client.request<Config>('workspace.settings.get', {}),
  })
}
