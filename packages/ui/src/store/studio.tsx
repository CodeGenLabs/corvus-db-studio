import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Dict } from '../i18n/dictionaries'
import type {
  Config,
  FilterCriterion,
  SortCriterion,
  Transport,
  View,
} from '@corvus/contract'
import { createClient, type Client } from '@corvus/client'
import type { Tab, TabIdentity } from '../tabs'
import { useShellStore, type ShellState } from './shell'

export type { ShellState, ShellState as StudioState }
export { DEFAULT_CONFIG } from './shell'

export function createStudioQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 0,
      },
    },
  })
}

const ClientContext = createContext<Client | null>(null)

export function useOptionalClient(): Client | null {
  return useContext(ClientContext)
}

export function useClient(): Client {
  const c = useContext(ClientContext)
  if (!c) throw new Error('useClient must be used within a StudioProvider with a valid transport')
  return c
}

export interface Studio {
  s: ShellState
  set: (patch: Partial<ShellState> | ((s: ShellState) => Partial<ShellState>)) => void
  t: Dict
  tr: (vi: string, en: string) => string
  rowH: number
  setCfg: <K extends keyof Config>(key: K, value: Config[K]) => void
  setView: (v: View) => () => void
  openTab: (identity: TabIdentity, options?: { title?: string }) => void
  closeTab: (tabId: string) => void
  focusTab: (tabId: string) => void
  setTabDirty: (tabId: string, dirty: boolean) => void
  activeTab: () => Tab | undefined
  row: (extra?: CSSProperties) => CSSProperties
  beginDrag: (e: React.MouseEvent, pane: 'nav' | 'info') => void
  cycleLang: () => void
  toggleTheme: () => void
  startUpdate: () => void
  runBackup: () => void
  filterCriteria: FilterCriterion[]
  sortCriteria: SortCriterion[]
  navOpen: boolean
  infoOpen: boolean
  closeConnection: (connectionId: string) => Promise<void>
}

export function StudioProvider({
  children,
  transport,
  queryClient: customQueryClient,
}: {
  children: ReactNode
  transport: Transport
  queryClient?: QueryClient
}) {
  const set = useShellStore((state) => state.set)

  const client = useMemo(() => {
    return createClient(transport)
  }, [transport])

  const activeQueryClient = useMemo(
    () => customQueryClient ?? createStudioQueryClient(),
    [customQueryClient],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        set({ showPalette: true })
      }
      if (e.key === 'Escape') set({ showPalette: false, showConn: false, dialog: null, menu: null })
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        set({ dialog: 'settings' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  return (
    <ClientContext.Provider value={client}>
      <QueryClientProvider client={activeQueryClient}>{children}</QueryClientProvider>
    </ClientContext.Provider>
  )
}

export function useStudio(): Studio {
  const store = useShellStore()
  const client = useContext(ClientContext)

  const closeConnection = async (connectionId: string) => {
    if (client) {
      try {
        await client.request('connection.close', { id: connectionId })
      } catch {
        // ignore
      }
    }
    store.set((prev) => {
      const nextOpen = { ...prev.open }
      for (const k of Object.keys(nextOpen)) {
        if (k === connectionId || k.startsWith(`${connectionId}/`)) {
          delete nextOpen[k]
        }
      }
      const nextTabs = prev.tabs.filter((t) => {
        const tConnId = t.identity.type === 'object' ? t.identity.connectionId : t.identity.connectionId
        return tConnId !== connectionId
      })
      const nextActiveTabId = nextTabs.some((t) => t.id === prev.activeTabId)
        ? prev.activeTabId
        : (nextTabs[0]?.id ?? null)
      return {
        open: nextOpen,
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
      }
    })
  }

  return {
    s: store,
    set: store.set,
    t: store.t(),
    tr: store.tr,
    rowH: store.rowH(),
    setCfg: store.setCfg,
    setView: store.setView,
    openTab: store.openTab,
    closeTab: store.closeTab,
    focusTab: store.focusTab,
    setTabDirty: store.setTabDirty,
    activeTab: store.activeTab,
    row: store.row,
    beginDrag: store.beginDrag,
    cycleLang: store.cycleLang,
    toggleTheme: store.toggleTheme,
    startUpdate: store.startUpdate,
    runBackup: store.runBackup,
    filterCriteria: store.filterCriteria(),
    sortCriteria: store.sortCriteria(),
    navOpen: store.nav,
    infoOpen: store.info,
    closeConnection,
  }
}
