import { create } from 'zustand'
import type { CSSProperties } from 'react'
import type {
  BackupOptions,
  BackupScope,
  Config,
  DialogId,
  FilterCriterion,
  InfoTab,
  MenuKey,
  ObjectKind,
  SettingsSection,
  SortCriterion,
  View,
} from '@corvus/contract'
import { DICTS, JA_X, LANG_NEXT, type Dict, type Lang } from '../i18n/dictionaries'
import type { ImportableConnectionProfile } from '../utils/connection-export-import'
import {
  closeTabInState,
  openTabInState,
  updateTabInState,
  type Tab,
  type TabIdentity,
} from '../tabs'

export const DEFAULT_CONFIG: Config = {
  autoCommit: true,
  confirmDelete: true,
  sqlUpper: true,
  sslDefault: true,
  showLineNos: true,
  fontSize: 12.5,
  rowLimit: 1000,
  timeout: 30,
  keymap: 'default',
  aiModel: 'Claude Sonnet',
  autoUpdate: true,
  aiSchemaAccess: true,
  gridNull: 'highlight',
  startupView: 'objects',
  density: 'compact',
  mono: 'plex',
}

export interface ShellState {
  lang: Lang
  theme: 'light' | 'dark'
  view: View
  infoTab: InfoTab
  open: Record<string, boolean>
  tabs: Tab[]
  activeTabId: string | null
  showConn: boolean
  showPalette: boolean
  diffOnly: boolean
  nav: boolean
  info: boolean
  navW: number
  infoW: number
  dragPane: 'nav' | 'info' | null
  menu: MenuKey | null
  dialog: DialogId
  setSection: SettingsSection
  updatePct: number
  updating: boolean
  cfg: Config
  showFilter: boolean
  flMode: 'builder' | 'text'
  flCrit: FilterCriterion[] | null
  flSort: SortCriterion[] | null
  bkScope: BackupScope
  bkOpt: BackupOptions
  bkPct: number
  bkRunning: boolean
  bkSel: string | null
  connKind: string
  userMenu: boolean
  userSel: string | null
  selectedObjectKind?: ObjectKind
  importConnData: { open: boolean; connections: ImportableConnectionProfile[]; fileName?: string } | null
}

const INITIAL_SHELL_STATE: ShellState = {
  lang: 'vi',
  theme: 'light',
  view: 'objects',
  infoTab: 'info',
  open: {},
  tabs: [],
  activeTabId: null,
  showConn: false,
  showPalette: false,
  diffOnly: true,
  nav: true,
  info: true,
  navW: 246,
  infoW: 304,
  dragPane: null,
  menu: null,
  dialog: null,
  setSection: 'general',
  updatePct: 0,
  updating: false,
  cfg: DEFAULT_CONFIG,
  showFilter: false,
  flMode: 'builder',
  flCrit: null,
  flSort: null,
  bkScope: 'full',
  bkOpt: { compress: true, routines: true, dataOnly: false, verify: true },
  bkPct: 0,
  bkRunning: false,
  bkSel: null,
  connKind: 'mysql',
  userMenu: false,
  userSel: null,
  selectedObjectKind: 'table',
  importConnData: null,
}

type Patch = Partial<ShellState> | ((prev: ShellState) => Partial<ShellState>)

export interface ShellStore extends ShellState {
  set: (patch: Patch) => void
  setCfg: <K extends keyof Config>(key: K, value: Config[K]) => void
  setView: (v: View) => () => void
  openTab: (identity: TabIdentity, options?: { title?: string }) => void
  closeTab: (tabId: string) => void
  focusTab: (tabId: string) => void
  setTabDirty: (tabId: string, dirty: boolean) => void
  activeTab: () => Tab | undefined
  cycleLang: () => void
  toggleTheme: () => void
  startUpdate: () => void
  runBackup: () => void
  beginDrag: (e: React.MouseEvent, pane: 'nav' | 'info') => void
  rowH: () => number
  row: (extra?: CSSProperties) => CSSProperties
  t: () => Dict
  tr: (vi: string, en: string) => string
  filterCriteria: () => FilterCriterion[]
  sortCriteria: () => SortCriterion[]
}

let updateTimer: number | null = null
let backupTimer: number | null = null

export const useShellStore = create<ShellStore>((setState, getState) => ({
  ...INITIAL_SHELL_STATE,

  set: (patch: Patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  },

  setCfg: <K extends keyof Config>(key: K, value: Config[K]) => {
    setState((prev) => ({ cfg: { ...prev.cfg, [key]: value } }))
  },

  setView: (v: View) => () => {
    setState({ view: v, showPalette: false })
  },

  openTab: (identity: TabIdentity, options?: { title?: string }) => {
    const s = getState()
    const { nextState } = openTabInState(
      { tabs: s.tabs, activeTabId: s.activeTabId },
      identity,
      options,
    )
    const view = identity.type === 'object' ? identity.contentKind : identity.toolKind
    setState({
      tabs: nextState.tabs,
      activeTabId: nextState.activeTabId,
      view,
      showPalette: false,
    })
  },

  closeTab: (tabId: string) => {
    const s = getState()
    const { nextState } = closeTabInState({ tabs: s.tabs, activeTabId: s.activeTabId }, tabId)
    let nextView = s.view
    if (nextState.activeTabId) {
      const current = nextState.tabs.find((t) => t.id === nextState.activeTabId)
      if (current) {
        nextView = current.identity.type === 'object' ? current.identity.contentKind : current.identity.toolKind
      }
    }
    setState({
      tabs: nextState.tabs,
      activeTabId: nextState.activeTabId,
      view: nextView,
    })
  },

  focusTab: (tabId: string) => {
    const s = getState()
    const target = s.tabs.find((t) => t.id === tabId)
    if (!target) return
    const view = target.identity.type === 'object' ? target.identity.contentKind : target.identity.toolKind
    setState({
      activeTabId: tabId,
      view,
    })
  },

  setTabDirty: (tabId: string, dirty: boolean) => {
    const s = getState()
    const nextState = updateTabInState({ tabs: s.tabs, activeTabId: s.activeTabId }, tabId, { dirty })
    setState({ tabs: nextState.tabs })
  },

  activeTab: () => {
    const s = getState()
    return s.tabs.find((t) => t.id === s.activeTabId)
  },

  cycleLang: () => {
    setState((prev) => ({ lang: LANG_NEXT[prev.lang] }))
  },

  toggleTheme: () => {
    setState((prev) => ({ theme: prev.theme === 'dark' ? 'light' : 'dark' }))
  },

  startUpdate: () => {
    const s = getState()
    if (s.updating) return
    if (s.updatePct >= 100) {
      setState({ updatePct: 0 })
      return
    }
    setState({ updating: true, updatePct: 0 })
    if (updateTimer) window.clearTimeout(updateTimer)
    updateTimer = window.setTimeout(() => setState({ updating: false, updatePct: 100 }), 4000)
  },

  runBackup: () => {
    const s = getState()
    if (s.bkRunning) return
    if (backupTimer) window.clearInterval(backupTimer)
    setState({ bkRunning: true, bkPct: 0 })
    backupTimer = window.setInterval(() => {
      setState((prev) => {
        const next = Math.min(100, prev.bkPct + 5)
        if (next >= 100 && backupTimer) {
          window.clearInterval(backupTimer)
          backupTimer = null
        }
        return { bkPct: next, bkRunning: next < 100 }
      })
    }, 180)
  },

  beginDrag: (e: React.MouseEvent, pane: 'nav' | 'info') => {
    e.preventDefault()
    const s = getState()
    const startX = e.clientX
    const startW = pane === 'nav' ? s.navW : s.infoW
    setState({ dragPane: pane })

    const move = (ev: MouseEvent) => {
      const delta = pane === 'nav' ? ev.clientX - startX : startX - ev.clientX
      const w = Math.max(180, Math.min(520, startW + delta))
      setState(pane === 'nav' ? { navW: w } : { infoW: w })
    }

    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      setState({ dragPane: null })
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  },

  rowH: () => (getState().cfg.density === 'compact' ? 23 : 28),

  row: (extra?: CSSProperties) => {
    const h = getState().cfg.density === 'compact' ? 23 : 28
    return {
      height: `${h}px`,
      alignItems: 'center',
      fontSize: '12px',
      borderBottom: '1px solid var(--grid-line)',
      cursor: 'default',
      ...extra,
    }
  },

  t: () => DICTS[getState().lang],

  tr: (vi: string, en: string) => {
    const lang = getState().lang
    return lang === 'ja' ? (JA_X[en] ?? en) : lang === 'vi' ? vi : en
  },

  filterCriteria: () => {
    const s = getState()
    return s.flCrit ?? []
  },

  sortCriteria: () => {
    const s = getState()
    return s.flSort ?? []
  },
}))
