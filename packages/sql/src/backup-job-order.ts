export interface BackupObjectItem {
  id: string
  name: string
  schema?: string
  type: 'schema' | 'type' | 'table_structure' | 'table_data' | 'view' | 'routine' | 'index' | 'foreign_key' | 'trigger'
  ddlOrData: string
}

export class BackupJobOrderManager {
  /**
   * Sorts database objects into safe backup / restore sequence:
   * Schemas -> Types -> Tables (structure) -> Table Data -> Views -> Routines -> Indexes -> Foreign Keys -> Triggers
   */
  public static sortObjects(objects: BackupObjectItem[]): BackupObjectItem[] {
    const priority: Record<BackupObjectItem['type'], number> = {
      schema: 1,
      type: 2,
      table_structure: 3,
      table_data: 4,
      view: 5,
      routine: 6,
      index: 7,
      foreign_key: 8,
      trigger: 9,
    }

    return [...objects].sort((a, b) => {
      const pDiff = (priority[a.type] || 99) - (priority[b.type] || 99)
      if (pDiff !== 0) return pDiff
      return a.name.localeCompare(b.name)
    })
  }
}
