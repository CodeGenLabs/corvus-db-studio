export interface ColumnDisplayConfig {
  hiddenColumns: string[]
  frozenColumnCount: number
  columnOrder?: string[]
}

export class ColumnConfigManager {
  private static STORAGE_KEY = 'corvus_column_config'

  private static getKey(connectionId: string, schema: string, table: string): string {
    return `${this.STORAGE_KEY}_${connectionId}_${schema}_${table}`
  }

  public static getConfig(connectionId: string, schema: string, table: string): ColumnDisplayConfig {
    try {
      const raw = localStorage.getItem(this.getKey(connectionId, schema, table))
      if (!raw) return { hiddenColumns: [], frozenColumnCount: 0 }
      return JSON.parse(raw)
    } catch {
      return { hiddenColumns: [], frozenColumnCount: 0 }
    }
  }

  public static saveConfig(
    connectionId: string,
    schema: string,
    table: string,
    config: ColumnDisplayConfig,
  ): void {
    try {
      localStorage.setItem(this.getKey(connectionId, schema, table), JSON.stringify(config))
    } catch {
      // Ignore
    }
  }
}
