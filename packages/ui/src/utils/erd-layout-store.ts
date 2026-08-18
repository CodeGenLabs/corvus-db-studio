export interface NodePosition {
  x: number
  y: number
}

export type ErdLayoutPositions = Record<string, NodePosition>

export class ErdLayoutStore {
  private static STORAGE_KEY = 'corvus_erd_positions'

  private static getKey(connectionId: string, schema: string): string {
    return `${this.STORAGE_KEY}_${connectionId}_${schema}`
  }

  public static getPositions(connectionId: string, schema: string): ErdLayoutPositions {
    try {
      const raw = localStorage.getItem(this.getKey(connectionId, schema))
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  public static savePositions(
    connectionId: string,
    schema: string,
    positions: ErdLayoutPositions,
  ): void {
    try {
      localStorage.setItem(this.getKey(connectionId, schema), JSON.stringify(positions))
    } catch {
      // Ignore
    }
  }
}
