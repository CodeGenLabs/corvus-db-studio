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
  _deps: HandlerDeps,
): void {
  // ── workspace.settings.get (UNARY) ────────────────────────────────────────
  router.registerUnary('workspace.settings.get', async (_params) => {
    return { ...inMemorySettings }
  })

  // ── workspace.settings.set (UNARY) ────────────────────────────────────────
  router.registerUnary('workspace.settings.set', async (params) => {
    const p = params as { settings: Record<string, unknown> }
    Object.assign(inMemorySettings, p.settings ?? {})
    return { success: true }
  })
}
