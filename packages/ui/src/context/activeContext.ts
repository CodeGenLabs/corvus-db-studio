import type { CapabilitySet, ObjectKind } from '@corvus/contract'
import type { Dict } from '../i18n/dictionaries'

export type ConnectionState = 'closed' | 'opening' | 'open' | 'error'

export interface RedactedError {
  readonly messageKey: keyof Dict
  readonly detail: string | null
  readonly retryable: boolean
}

export interface ObjectSelection {
  readonly objectKind: ObjectKind | null
  readonly targets: readonly string[]
  readonly primaryTarget: string | null
  readonly kind: ObjectKind | null
  readonly names: readonly string[]
  readonly anchor: string | null
}

export const EMPTY_SELECTION: ObjectSelection = {
  objectKind: null,
  targets: [],
  primaryTarget: null,
  kind: null,
  names: [],
  anchor: null,
}

export interface ActiveContext {
  readonly connectionId: string | null
  readonly connectionName: string | null
  readonly driverId: string | null
  readonly serverVersion: string | null
  readonly serverEncoding: string | null
  readonly database: string | null
  readonly namespace: string | null
  readonly selection: ObjectSelection
  readonly capabilities: CapabilitySet | null
  readonly connectionState: ConnectionState
  readonly lastError: RedactedError | null
  readonly permissions?: readonly string[]
}

export const INITIAL_ACTIVE_CONTEXT: ActiveContext = {
  connectionId: null,
  connectionName: null,
  driverId: null,
  serverVersion: null,
  serverEncoding: null,
  database: null,
  namespace: null,
  selection: EMPTY_SELECTION,
  capabilities: null,
  connectionState: 'closed',
  lastError: null,
}

export interface TransitionOpenPatch {
  readonly capabilities: CapabilitySet
  readonly serverVersion?: string | null
  readonly serverEncoding?: string | null
  readonly database?: string | null
  readonly namespace?: string | null
}

export interface TransitionErrorPatch {
  readonly lastError: RedactedError
}

export interface TransitionOpeningPatch {
  readonly connectionId: string
  readonly connectionName: string
  readonly driverId: string
  readonly database?: string | null
  readonly namespace?: string | null
}

export function createSelection(names: readonly string[], kind: ObjectKind | null, anchor?: string | null): ObjectSelection {
  if (names.length === 0) {
    return EMPTY_SELECTION
  }
  const effectiveAnchor = anchor !== undefined && anchor !== null && names.includes(anchor) ? anchor : names[0]
  return {
    objectKind: kind,
    targets: names,
    primaryTarget: effectiveAnchor ?? null,
    kind,
    names,
    anchor: effectiveAnchor ?? null,
  }
}

export type ConnectionAction = 'start-open' | 'open-success' | 'open-error' | 'close'

export function transitionConnectionState(
  state: ConnectionState,
  action: ConnectionAction,
): ConnectionState
export function transitionConnectionState(
  ctx: ActiveContext,
  nextState: 'closed',
): ActiveContext
export function transitionConnectionState(
  ctx: ActiveContext,
  nextState: 'opening',
  patch: TransitionOpeningPatch,
): ActiveContext
export function transitionConnectionState(
  ctx: ActiveContext,
  nextState: 'open',
  patch: TransitionOpenPatch,
): ActiveContext
export function transitionConnectionState(
  ctx: ActiveContext,
  nextState: 'error',
  patch: TransitionErrorPatch,
): ActiveContext
export function transitionConnectionState(
  ctxOrState: ActiveContext | ConnectionState,
  nextStateOrAction: ConnectionState | ConnectionAction,
  patch?: TransitionOpeningPatch | TransitionOpenPatch | TransitionErrorPatch,
): ActiveContext | ConnectionState {
  if (typeof ctxOrState === 'string') {
    const action = nextStateOrAction as ConnectionAction
    switch (action) {
      case 'start-open':
        return 'opening'
      case 'open-success':
        return 'open'
      case 'open-error':
        return 'error'
      case 'close':
        return 'closed'
    }
  }

  const ctx = ctxOrState
  const nextState = nextStateOrAction as ConnectionState
  switch (nextState) {
    case 'closed':
      return {
        ...ctx,
        database: null,
        namespace: null,
        selection: EMPTY_SELECTION,
        capabilities: null,
        connectionState: 'closed',
        lastError: null,
      }
    case 'opening': {
      const p = patch as TransitionOpeningPatch
      return {
        ...ctx,
        connectionId: p.connectionId,
        connectionName: p.connectionName,
        driverId: p.driverId,
        database: p.database ?? null,
        namespace: p.namespace ?? null,
        selection: EMPTY_SELECTION,
        capabilities: null,
        connectionState: 'opening',
        lastError: null,
      }
    }
    case 'open': {
      const p = patch as TransitionOpenPatch
      return {
        ...ctx,
        capabilities: p.capabilities,
        serverVersion: p.serverVersion ?? ctx.serverVersion,
        serverEncoding: p.serverEncoding ?? ctx.serverEncoding,
        database: p.database !== undefined ? p.database : ctx.database,
        namespace: p.namespace !== undefined ? p.namespace : ctx.namespace,
        connectionState: 'open',
        lastError: null,
      }
    }
    case 'error': {
      const p = patch as TransitionErrorPatch
      return {
        ...ctx,
        capabilities: null,
        connectionState: 'error',
        lastError: p.lastError,
      }
    }
  }
}
