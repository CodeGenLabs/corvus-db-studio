export interface WorkspaceConnectionExport {
  id: string
  name: string
  engine: string
  host?: string
  port?: number
  database?: string
  username?: string
  group?: string
  // Passwords / Secrets MUST NEVER be included in .corvusws export
}

/**
 * Hình dạng connection ĐẦU VÀO cho export. Cố tình rộng và toàn optional vì nguồn có thể
 * là `ConnectionProfile` của contract hoặc bản ghi thô từ workspace.db (tên field khác nhau:
 * engine/driver, username/user). KHÔNG chứa field bí mật — xem WorkspaceConnectionExport.
 */
export interface WorkspaceConnectionInput {
  id: string
  name: string
  engine?: string
  driver?: string
  host?: string
  port?: number
  database?: string
  username?: string
  user?: string
  group?: string
}

export interface WorkspaceArchive {
  format: 'corvusws'
  version: '1.0'
  exportedAt: string
  connections: WorkspaceConnectionExport[]
  settings?: Record<string, unknown>
  snippets?: Array<{ id: string; title: string; sql: string }>
}

export class WorkspaceArchiveManager {
  /**
   * Serializes workspace into exportable .corvusws JSON string (sanitized, zero credentials)
   */
  public static exportWorkspace(
    connections: WorkspaceConnectionInput[],
    settings?: Record<string, unknown>,
    snippets?: Array<{ id: string; title: string; sql: string }>,
  ): string {
    const sanitizedConnections: WorkspaceConnectionExport[] = connections.map((c) => ({
      id: c.id,
      name: c.name,
      engine: c.engine || c.driver || 'postgres',
      host: c.host,
      port: c.port,
      database: c.database,
      username: c.username || c.user,
      group: c.group,
    }))

    const archive: WorkspaceArchive = {
      format: 'corvusws',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      connections: sanitizedConnections,
      settings,
      snippets,
    }

    return JSON.stringify(archive, null, 2)
  }

  /**
   * Parses and validates a .corvusws file content
   */
  public static importWorkspace(archiveJson: string): WorkspaceArchive {
    const parsed = JSON.parse(archiveJson) as WorkspaceArchive
    if (parsed.format !== 'corvusws') {
      throw new Error('Định dạng tệp không hợp lệ: Không phải tệp workspace .corvusws')
    }
    return parsed
  }
}
