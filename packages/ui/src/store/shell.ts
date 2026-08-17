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
  SettingsSection,
  SortCriterion,
  View,
} from '@corvus/contract'
import { DICTS, JA_X, LANG_NEXT, type Dict, type Lang } from '../i18n/dictionaries'
import { fieldsFor } from '../data/schema'

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
  selTable: string
  selNode: string
  selField: string
  open: Record<string, boolean>
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
}

const INITIAL_SHELL_STATE: ShellState = {
  lang: 'vi',
  theme: 'light',
  view: 'objects',
  infoTab: 'info',
  selTable: 'country',
  selNode: 'sakila/Tables',
  selField: 'country',
  open: { 'Local Dev': true, sakila: true },
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
  connKind: 'MySQL / MariaDB',
  userMenu: false,
  userSel: null,
}

type Patch = Partial<ShellState> | ((prev: ShellState) => Partial<ShellState>)

export interface ShellStore extends ShellState {
  set: (patch: Patch) => void
  setCfg: <K extends keyof Config>(key: K, value: Config[K]) => void
  setView: (v: View) => () => void
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

function defaultCriteria(table: string): FilterCriterion[] {
  const f = fieldsFor(table)
  const dateCol = f.find((x) => x.type === 'timestamp')
  const textCol = f.find((x) => x.type === 'varchar')
  const out: FilterCriterion[] = [{ join: 'WHERE', field: f[0]?.name ?? 'id', op: '>=', value: '1' }]
  if (dateCol) out.push({ join: 'AND', field: dateCol.name, op: '>=', value: '2026-08-01' })
  else if (textCol) out.push({ join: 'AND', field: textCol.name, op: 'LIKE', value: '%a%' })
  return out
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
    return s.flCrit ?? defaultCriteria(s.selTable)
  },

  sortCriteria: () => {
    const s = getState()
    return s.flSort ?? [{ field: fieldsFor(s.selTable)[0]?.name ?? 'id', dir: 'ASC' }]
  },
}))
