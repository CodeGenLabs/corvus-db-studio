export interface SqlDraft {
  tabId: string
  sql: string
  updatedAt: number
  cursorPos?: { line: number; ch: number }
}

const STORAGE_PREFIX = 'corvus_sql_draft_'

export const DraftManager = {
  saveDraft(tabId: string, sql: string, cursorPos?: { line: number; ch: number }): void {
    if (typeof localStorage === 'undefined') return
    try {
      const draft: SqlDraft = {
        tabId,
        sql,
        updatedAt: Date.now(),
        cursorPos,
      }
      localStorage.setItem(`${STORAGE_PREFIX}${tabId}`, JSON.stringify(draft))
    } catch {
      // Ignore quota errors
    }
  },

  loadDraft(tabId: string): SqlDraft | null {
    if (typeof localStorage === 'undefined') return null
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${tabId}`)
      if (!raw) return null
      return JSON.parse(raw) as SqlDraft
    } catch {
      return null
    }
  },

  clearDraft(tabId: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${tabId}`)
    } catch {
      // Ignore
    }
  },

  listAllDrafts(): SqlDraft[] {
    if (typeof localStorage === 'undefined') return []
    const drafts: SqlDraft[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key)
          if (raw) {
            drafts.push(JSON.parse(raw) as SqlDraft)
          }
        }
      }
    } catch {
      // Ignore
    }
    return drafts.sort((a, b) => b.updatedAt - a.updatedAt)
  },
}
