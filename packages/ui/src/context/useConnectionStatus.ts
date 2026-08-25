import { useQuery } from '@tanstack/react-query'
import { useOptionalClient } from '../store/studio'

export interface ConnectionStatusInfo {
  serverVersion: string | null
  serverEncoding: string | null
}

/**
 * Đọc thông tin trạng thái máy chủ (serverVersion, serverEncoding) từ connection.status (FR-002).
 */
export function useConnectionStatus(connectionId?: string | null): {
  status: ConnectionStatusInfo | null
  isLoading: boolean
  error: Error | null
} {
  const client = useOptionalClient()

  const query = useQuery({
    queryKey: ['connection', connectionId, 'status'],
    queryFn: async (): Promise<ConnectionStatusInfo> => {
      if (!connectionId || !client) throw new Error('connectionId and client are required')
      const res = await client.request<{ version?: string; encoding?: string }>('connection.status', {
        id: connectionId,
      })
      return {
        serverVersion: res.version ?? null,
        serverEncoding: res.encoding ?? null,
      }
    },
    enabled: !!connectionId && !!client,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error) ?? null,
  }
}
