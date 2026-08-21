import type { EngineRouter } from '../router'
import type { HandlerDeps } from './context'

const inMemorySettings: Record<string, unknown> = {
  theme: 'dark',
  locale: 'vi',
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
  },
}

export function registerWorkspaceHandlers(
  router: EngineRouter,
  deps: HandlerDeps,
): void {
  // ── workspace.settings.get (UNARY) ────────────────────────────────────────
  router.registerUnary('workspace.settings.get', async (params, ctx) => {
    const ownerId = ctx?.actor?.id || (params as { ownerId?: string })?.ownerId || 'default'
    if (deps.settings?.get) {
      const persisted = await deps.settings.get(ownerId)
      return { ...inMemorySettings, ...persisted }
    }
    return { ...inMemorySettings }
  })

  // ── workspace.settings.set (UNARY) ────────────────────────────────────────
  router.registerUnary('workspace.settings.set', async (params, ctx) => {
    const p = params as { settings: Record<string, unknown>; ownerId?: string }
    const ownerId = ctx?.actor?.id || p.ownerId || 'default'
    Object.assign(inMemorySettings, p.settings ?? {})
    if (deps.settings?.set) {
      await deps.settings.set(ownerId, p.settings ?? {})
    }
    return { success: true }
  })
}
