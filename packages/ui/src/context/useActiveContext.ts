import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ConnectionProfile } from '@corvus/contract'
import { useStudio, useOptionalClient } from '../store/studio'
import {
  INITIAL_ACTIVE_CONTEXT,
  type ActiveContext,
  createSelection,
} from './activeContext'
import { useCapabilities } from './useCapabilities'
import { useConnectionStatus } from './useConnectionStatus'

/**
 * Trả về ActiveContext hợp nhất cho tab đang hoạt động hoặc ngữ cảnh hiện tại (FR-004).
 */
export function useActiveContext(): ActiveContext {
  const { s } = useStudio()
  const client = useOptionalClient()
  const activeTab = s.tabs.find((t) => t.id === s.activeTabId)

  const activeIdentity = activeTab?.identity
  const connectionId =
    (activeIdentity?.type === 'object' ? activeIdentity.connectionId : activeIdentity?.connectionId) ??
    (s.tabs.length > 0 && s.tabs[0].identity.connectionId ? s.tabs[0].identity.connectionId : null)

  const database = activeIdentity?.database ?? null
  const namespace = activeIdentity?.namespace ?? null

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => (client ? client.request<ConnectionProfile[]>('connection.list', {}) : []),
    enabled: !!client,
  })

  const profile = Array.isArray(connections) ? connections.find((c) => c.id === connectionId) : undefined
  const { capabilities, error: capsError } = useCapabilities(connectionId)
  const { status } = useConnectionStatus(connectionId)

  return useMemo<ActiveContext>(() => {
    if (!connectionId) {
      return INITIAL_ACTIVE_CONTEXT
    }

    const objectName = activeIdentity?.type === 'object' ? activeIdentity.name : null
    const objectKind = activeIdentity?.type === 'object' ? activeIdentity.objectKind : null

    const selection = objectName
      ? createSelection([objectName], objectKind, objectName)
      : INITIAL_ACTIVE_CONTEXT.selection

    const connectionState = capsError ? 'error' : capabilities ? 'open' : 'opening'

    return {
      connectionId,
      connectionName: profile?.name ?? connectionId,
      driverId: profile?.driverId ?? (capabilities as unknown as { driverId?: string })?.driverId ?? null,
      serverVersion: status?.serverVersion ?? null,
      serverEncoding: status?.serverEncoding ?? null,
      database,
      namespace,
      selection,
      capabilities,
      connectionState,
      lastError: capsError
        ? {
            messageKey: 'navLoadFailed',
            detail: capsError.message,
            retryable: true,
          }
        : null,
    }
  }, [connectionId, activeIdentity, capabilities, capsError, status, database, namespace, profile])
}
