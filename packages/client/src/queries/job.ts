import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { JobMeta } from '@corvus/contract'
import type { Client } from '../createClient'

export function useJobsQuery(client: Client): UseQueryResult<JobMeta[]> {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => client.request<JobMeta[]>('job.list', {}),
  })
}
