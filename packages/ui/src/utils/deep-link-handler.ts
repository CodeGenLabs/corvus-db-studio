import { decodeCorvusUri, type CorvusShareTarget } from './share-uri'

export interface DeepLinkNavigationRequest {
  target: CorvusShareTarget
  action: 'open_connection' | 'open_table' | 'open_view'
}

export function handleDeepLink(
  uri: string,
  onNavigate: (req: DeepLinkNavigationRequest) => void,
): boolean {
  const target = decodeCorvusUri(uri)
  if (!target) return false

  let action: DeepLinkNavigationRequest['action'] = 'open_connection'
  if (target.table) {
    action = 'open_table'
  } else if (target.view) {
    action = 'open_view'
  }

  onNavigate({ target, action })
  return true
}
