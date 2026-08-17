import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { DICTS, JA_X, LANG_NEXT, type Dict, type Lang } from '../i18n/dictionaries'
import { fieldsFor } from '../data/schema'
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
} from '../types'

const DEFAULT_CONFIG: Config = {
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

export interface StudioState {
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
  /** `null` means "not touched yet" — the panel then derives criteria from the table. */
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

const INITIAL: StudioState = {
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

type Patch = Partial<StudioState> | ((s: StudioState) => Partial<StudioState>)

export interface Studio {
  s: StudioState
  set: (patch: Patch) => void
  /** Translated dictionary for the active language. */
  t: Dict
  /** Inline translation for strings that are not in the dictionaries. */
  tr: (vi: string, en: string) => string
  setCfg: <K extends keyof Config>(key: K, value: Config[K]) => void
  setView: (v: View) => () => void
  /** Grid/tree row height, driven by the density setting. */
  rowH: number
  /** Base style for a data row, merged with per-view extras. */
  row: (extra?: CSSProperties) => CSSProperties
  beginDrag: (e: React.MouseEvent, pane: 'nav' | 'info') => void
  cycleLang: () => void
  toggleTheme: () => void
  startUpdate: () => void
  runBackup: () => void
  /** Filter criteria, falling back to a sensible guess for the selected table. */
  filterCriteria: FilterCriterion[]
  sortCriteria: SortCriterion[]
  navOpen: boolean
  infoOpen: boolean
}

const StudioContext = createContext<Studio | null>(null)

function defaultCriteria(table: string): FilterCriterion[] {
  const f = fieldsFor(table)
  const dateCol = f.find((x) => x.type === 'timestamp')
  const textCol = f.find((x) => x.type === 'varchar')
  const out: FilterCriterion[] = [{ join: 'WHERE', field: f[0].name, op: '>=', value: '1' }]
  if (dateCol) out.push({ join: 'AND', field: dateCol.name, op: '>=', value: '2026-08-01' })
  else if (textCol) out.push({ join: 'AND', field: textCol.name, op: 'LIKE', value: '%a%' })
  return out
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [s, setState] = useState<StudioState>(INITIAL)
  const updateTimer = useRef<number | null>(null)
  const backupTimer = useRef<number | null>(null)

  const set = useCallback((patch: Patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

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

  useEffect(
    () => () => {
      if (updateTimer.current) window.clearTimeout(updateTimer.current)
      if (backupTimer.current) window.clearInterval(backupTimer.current)
    },
    [],
  )

  const value = useMemo<Studio>(() => {
    const t = DICTS[s.lang]
    const tr = (vi: string, en: string) => (s.lang === 'ja' ? (JA_X[en] ?? en) : s.lang === 'vi' ? vi : en)
    const rowH = s.cfg.density === 'compact' ? 23 : 28

    return {
      s,
      set,
      t,
      tr,
      rowH,
      setCfg: (key, val) => set((prev) => ({ cfg: { ...prev.cfg, [key]: val } })),
      setView: (v) => () => set({ view: v, showPalette: false }),
      row: (extra) => ({
        height: rowH + 'px',
        alignItems: 'center',
        fontSize: '12px',
        borderBottom: '1px solid var(--grid-line)',
        cursor: 'default',
        ...extra,
      }),
      beginDrag: (e, pane) => {
        e.preventDefault()
        const startX = e.clientX
        const startW = pane === 'nav' ? s.navW : s.infoW
        set({ dragPane: pane })
        const move = (ev: MouseEvent) => {
          const delta = pane === 'nav' ? ev.clientX - startX : startX - ev.clientX
          const w = Math.max(180, Math.min(520, startW + delta))
          set(pane === 'nav' ? { navW: w } : { infoW: w })
        }
        const up = () => {
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', up)
          set({ dragPane: null })
        }
        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
      },
      cycleLang: () => set({ lang: LANG_NEXT[s.lang] }),
      toggleTheme: () => set({ theme: s.theme === 'dark' ? 'light' : 'dark' }),
      startUpdate: () => {
        if (s.updating) return
        if (s.updatePct >= 100) {
          set({ updatePct: 0 })
          return
        }
        set({ updating: true, updatePct: 0 })
        if (updateTimer.current) window.clearTimeout(updateTimer.current)
        updateTimer.current = window.setTimeout(() => set({ updating: false, updatePct: 100 }), 4000)
      },
      runBackup: () => {
        if (s.bkRunning) return
        if (backupTimer.current) window.clearInterval(backupTimer.current)
        set({ bkRunning: true, bkPct: 0 })
        backupTimer.current = window.setInterval(() => {
          setState((prev) => {
            const next = Math.min(100, prev.bkPct + 5)
            if (next >= 100 && backupTimer.current) {
              window.clearInterval(backupTimer.current)
              backupTimer.current = null
            }
            return { ...prev, bkPct: next, bkRunning: next < 100 }
          })
        }, 180)
      },
      filterCriteria: s.flCrit ?? defaultCriteria(s.selTable),
      sortCriteria: s.flSort ?? [{ field: fieldsFor(s.selTable)[0].name, dir: 'ASC' }],
      navOpen: s.nav,
      infoOpen: s.info,
    }
  }, [s, set])

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio(): Studio {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used inside <StudioProvider>')
  return ctx
}
