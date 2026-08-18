export interface ToolProfile {
  id: string
  name: string
  toolType: 'import' | 'export' | 'backup' | 'transfer'
  config: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const STORAGE_PREFIX = 'corvus_tool_profile_'

export const ToolProfileManager = {
  saveProfile(profile: ToolProfile): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${profile.id}`, JSON.stringify(profile))
    } catch {
      // Ignore
    }
  },

  loadProfile(id: string): ToolProfile | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
      if (!raw) return null
      return JSON.parse(raw) as ToolProfile
    } catch {
      return null
    }
  },

  listProfiles(toolType?: ToolProfile['toolType']): ToolProfile[] {
    if (typeof localStorage === 'undefined') return []
    const results: ToolProfile[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const p = JSON.parse(raw) as ToolProfile
            if (!toolType || p.toolType === toolType) {
              results.push(p)
            }
          }
        }
      }
    } catch {
      // Ignore
    }
    return results.sort((a, b) => b.updatedAt - a.updatedAt)
  },

  deleteProfile(id: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`)
    } catch {
      // Ignore
    }
  },
}
