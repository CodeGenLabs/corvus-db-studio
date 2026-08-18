export interface PersistedTabInfo {
  id: string
  title: string
  viewType: string
  connectionId?: string
  database?: string
  schema?: string
  tableName?: string
  queryDraft?: string
}

export type StartupRestoreMode = 'restore_previous' | 'open_empty' | 'custom_workspace'

export class TabSessionManager {
  private static STORAGE_KEY = 'corvus_persisted_tabs'
  private static MODE_KEY = 'corvus_startup_mode'

  public static getStartupMode(): StartupRestoreMode {
    return (localStorage.getItem(this.MODE_KEY) as StartupRestoreMode) || 'restore_previous'
  }

  public static setStartupMode(mode: StartupRestoreMode): void {
    localStorage.setItem(this.MODE_KEY, mode)
  }

  public static getPersistedTabs(): PersistedTabInfo[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  public static saveTabs(tabs: PersistedTabInfo[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tabs))
    } catch {
      // Ignore
    }
  }

  public static clearTabs(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }
}
