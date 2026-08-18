export interface SchemaIdentifiers {
  schemas: string[]
  tables: string[]
  views: string[]
  routines: string[]
  columnsByTable: Record<string, string[]>
}

export class IdentifierCacheManager {
  private static cache: Map<string, SchemaIdentifiers> = new Map()

  public static set(connectionId: string, identifiers: SchemaIdentifiers): void {
    this.cache.set(connectionId, identifiers)
  }

  public static get(connectionId: string): SchemaIdentifiers | undefined {
    return this.cache.get(connectionId)
  }

  public static clear(connectionId?: string): void {
    if (connectionId) {
      this.cache.delete(connectionId)
    } else {
      this.cache.clear()
    }
  }
}
