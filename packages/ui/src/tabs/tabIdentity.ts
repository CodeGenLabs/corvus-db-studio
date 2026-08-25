import type { ContentKind, ObjectKind, ToolKind } from '@corvus/contract'
import type { ActiveContext } from '../context/activeContext'

export interface ObjectTabIdentity {
  type: 'object'
  contentKind: ContentKind
  connectionId: string
  database?: string
  namespace?: string
  objectKind: ObjectKind
  name: string
}

export interface ToolTabIdentity {
  type: 'tool'
  toolKind: ToolKind
  seq: number
  connectionId?: string
  database?: string
  namespace?: string
}

export type TabIdentity = ObjectTabIdentity | ToolTabIdentity

export interface Tab {
  id: string
  identity: TabIdentity
  title: string
  dirty?: boolean
  missing?: boolean
  context?: ActiveContext
}

/**
 * Sinh chuỗi khoá duy nhất đại diện cho danh tính tab.
 */
export function tabIdentityKey(identity: TabIdentity): string {
  if (identity.type === 'object') {
    return `object:${identity.connectionId}:${identity.database ?? ''}:${identity.namespace ?? ''}:${identity.objectKind}:${identity.name}:${identity.contentKind}`
  }
  return `tool:${identity.toolKind}:${identity.seq}:${identity.connectionId ?? ''}`
}

/**
 * So sánh hai danh tính tab xem có cùng trỏ tới một tab không (Bất biến IV-F).
 */
export function isSameTabIdentity(a: TabIdentity, b: TabIdentity): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'object' && b.type === 'object') {
    return (
      a.connectionId === b.connectionId &&
      (a.database ?? '') === (b.database ?? '') &&
      (a.namespace ?? '') === (b.namespace ?? '') &&
      a.objectKind === b.objectKind &&
      a.name === b.name &&
      a.contentKind === b.contentKind
    )
  }
  if (a.type === 'tool' && b.type === 'tool') {
    return (
      a.toolKind === b.toolKind &&
      a.seq === b.seq &&
      (a.connectionId ?? '') === (b.connectionId ?? '')
    )
  }
  return false
}

/**
 * Sinh tiêu đề hiển thị mặc định từ danh tính tab.
 */
export function tabTitleOf(identity: TabIdentity): string {
  if (identity.type === 'object') {
    if (identity.contentKind === 'design') return `Design: ${identity.name}`
    if (identity.contentKind === 'definition') return `Def: ${identity.name}`
    if (identity.contentKind === 'er') return `ER: ${identity.name}`
    return identity.database ? `${identity.name} @${identity.database}` : identity.name
  }
  const toolNames: Record<ToolKind, string> = {
    sql: 'SQL Query',
    compare: 'Data Compare',
    backup: 'Backup',
    jobs: 'Jobs',
    monitor: 'Monitor',
  }
  return identity.seq > 1 ? `${toolNames[identity.toolKind]} #${identity.seq}` : toolNames[identity.toolKind]
}
