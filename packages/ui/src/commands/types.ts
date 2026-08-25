import type { CapabilitySet, ObjectKind } from '@corvus/contract'
import type { Client } from '@corvus/client'
import type { Dict } from '../i18n/dictionaries'
import type { TabIdentity } from '../tabs'
import type { ActiveContext } from '../context/activeContext'

export type Surface =
  | 'toolbar'
  | 'menubar'
  | 'object-toolbar'
  | 'command-palette'
  | 'ctx-nav'
  | 'ctx-object-list'
  | 'ctx-data-grid'
  | 'ctx-sql-editor'
  | 'ctx-query-builder'
  | 'ctx-er-diagram'
  | 'ctx-tab-bar'
  | 'ctx-toolbar'
  | 'ctx-snippet'
  | 'ctx-job-list'
  | 'ctx-diff'

export type TargetKind =
  | 'connection'
  | 'database'
  | 'namespace'
  | 'object-group'
  | 'object'
  | 'sub-element'
  | 'cell'
  | 'row-header'
  | 'column-header'
  | 'editor-selection'
  | 'tab'
  | 'job'
  | 'snippet'
  | 'canvas-node'
  | 'canvas-edge'
  | 'diff-item'
  | 'empty'

export type DisabledReason =
  | 'no-connection'
  | 'engine-unsupported'
  | 'wrong-object-kind'
  | 'no-selection'
  | 'multi-selection-unsupported'
  | 'insufficient-permission'
  | 'capabilities-unknown'

export type AvailabilityVerdict =
  | { readonly state: 'enabled' }
  | { readonly state: 'disabled'; readonly reason: DisabledReason }
  | { readonly state: 'hidden'; readonly reason: DisabledReason }

export interface Availability {
  readonly needsConnection: boolean
  readonly capability?: (caps: CapabilitySet) => boolean
  readonly objectKinds?: readonly ObjectKind[]
  readonly permission?: string
}

export type DialogId = string

export interface PreviewRequest {
  readonly sql: string
  readonly description?: string
}

export interface PreviewToken {
  readonly token: string
  readonly sql: string
}

export interface CommandContext {
  readonly active: ActiveContext
  readonly client: Client
  readonly openTab: (identity: TabIdentity, options?: { title?: string }) => void
  readonly openDialog: (id: DialogId, params?: Record<string, unknown>) => void
  readonly requestPreview?: (req: PreviewRequest) => Promise<PreviewToken>
}

export interface Command {
  readonly id: string
  readonly labelKey: keyof Dict
  readonly availability: Availability
  readonly surfaces: readonly Surface[]
  readonly targets: readonly TargetKind[]
  readonly cardinality: 'single' | 'multi'
  readonly write: 'none' | 'preview-required'
  readonly rpc: readonly string[]
  run(ctx: CommandContext): Promise<void>
}
