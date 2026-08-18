export interface ColumnProfile {
  name: string
  visible: boolean
  width?: number
  pinned?: 'left' | 'right'
}

export interface TableProfile {
  tableName: string
  columns: ColumnProfile[]
  filterText?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  pageSize?: number
  updatedAt: number
}

const STORAGE_PREFIX = 'corvus_table_profile_'

export const TableProfileManager = {
  saveProfile(profile: TableProfile): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${profile.tableName}`, JSON.stringify(profile))
    } catch {
      // Ignore
    }
  },

  loadProfile(tableName: string): TableProfile | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableName}`)
      if (!raw) return null
      return JSON.parse(raw) as TableProfile
    } catch {
      return null
    }
  },

  clearProfile(tableName: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${tableName}`)
    } catch {
      // Ignore
    }
  },
}
