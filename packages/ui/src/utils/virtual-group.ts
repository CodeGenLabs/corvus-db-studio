export interface VirtualGroupConfig {
  id: string
  groupName: string
  color?: string
  objectNames: string[]
}

export class VirtualGroupManager {
  private static STORAGE_KEY = 'corvus_virtual_groups'

  public static getGroups(connectionId: string): VirtualGroupConfig[] {
    try {
      const raw = localStorage.getItem(`${this.STORAGE_KEY}_${connectionId}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  public static saveGroups(connectionId: string, groups: VirtualGroupConfig[]): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_${connectionId}`, JSON.stringify(groups))
    } catch {
      // Ignore
    }
  }

  public static addGroup(connectionId: string, group: VirtualGroupConfig): void {
    const groups = this.getGroups(connectionId)
    groups.push(group)
    this.saveGroups(connectionId, groups)
  }

  public static removeGroup(connectionId: string, groupId: string): void {
    const groups = this.getGroups(connectionId).filter((g) => g.id !== groupId)
    this.saveGroups(connectionId, groups)
  }
}
