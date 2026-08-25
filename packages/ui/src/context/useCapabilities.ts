import { useQuery } from '@tanstack/react-query'
import type { CapabilitySet } from '@corvus/contract'
import { useOptionalClient } from '../store/studio'

/**
 * Đọc CapabilitySet từ cache react-query dùng chung với useNavTree (contracts/active-context.md §3).
 *
 * RÀNG BUỘC BẮT BUỘC:
 * Dùng đúng khoá ['connection', connectionId, 'open'].
 * Tuyệt đối không tạo khoá mới để tránh gọi connection.open lần 2 hoặc lệch bản sao.
 */
export function useCapabilities(connectionId?: string | null): {
  capabilities: CapabilitySet | null
  isLoading: boolean
  error: Error | null
} {
  const client = useOptionalClient()

  const query = useQuery({
    queryKey: ['connection', connectionId, 'open'],
    queryFn: async (): Promise<CapabilitySet> => {
      if (!connectionId || !client) throw new Error('connectionId and client are required')
      const res = await client.request<{ capabilities: CapabilitySet }>('connection.open', {
        id: connectionId,
      })
      return res.capabilities
    },
    enabled: !!connectionId && !!client,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  return {
    capabilities: query.data ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error) ?? null,
  }
}
