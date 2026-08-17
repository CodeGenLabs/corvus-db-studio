import crypto from 'node:crypto'
import fs from 'node:fs'
import { corvusError } from '@corvus/contract'

export interface MigrationFile {
  version: number
  name: string
  sql: string
}

export function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content.trim()).digest('hex')
}

export interface SqliteDbLike {
  exec(sql: string): void
  prepare(sql: string): {
    get(...args: unknown[]): unknown
    all(...args: unknown[]): unknown[]
    run(...args: unknown[]): { changes: number }
  }
  pragma(pragmaSql: string, options?: { simple?: boolean }): unknown
}

export class MigrationRunner {
  private readonly migrations: MigrationFile[]

  constructor(migrations: MigrationFile[]) {
    this.migrations = [...migrations].sort((a, b) => a.version - b.version)
  }

  get maxVersion(): number {
    return this.migrations.length > 0 ? this.migrations[this.migrations.length - 1]!.version : 0
  }

  backupDatabase(dbPath: string, currentVersion: number): string {
    if (!fs.existsSync(dbPath)) return ''
    const backupPath = `${dbPath}.bak-${currentVersion}`
    fs.copyFileSync(dbPath, backupPath)
    return backupPath
  }

  run(db: SqliteDbLike, dbPath?: string): { applied: number; currentVersion: number } {
    // 1. Check user_version
    const versionResult = db.pragma('user_version', { simple: true })
    const currentDbVersion = typeof versionResult === 'number' ? versionResult : 0

    // T-028: Refuse to start if DB version is newer than application version
    if (currentDbVersion > this.maxVersion) {
      throw corvusError(
        'INTERNAL_ERROR',
        `Database version (${currentDbVersion}) is newer than application support (${this.maxVersion}). Please update Corvus DB Studio.`,
      )
    }

    // 2. Ensure schema_migration table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `)

    // 3. Verify checksums of already applied migrations
    const appliedRows = db
      .prepare('SELECT version, name, checksum FROM schema_migration ORDER BY version ASC')
      .all() as Array<{ version: number; name: string; checksum: string }>

    for (const applied of appliedRows) {
      const matchingFile = this.migrations.find((m) => m.version === applied.version)
      if (matchingFile) {
        const expectedChecksum = computeChecksum(matchingFile.sql)
        if (applied.checksum !== expectedChecksum) {
          throw corvusError(
            'INTERNAL_ERROR',
            `Migration checksum mismatch for version ${applied.version} (${applied.name}). Migration file has been altered.`,
          )
        }
      }
    }

    // 4. Find pending migrations
    const appliedVersions = new Set(appliedRows.map((r) => r.version))
    const pending = this.migrations.filter((m) => !appliedVersions.has(m.version))

    if (pending.length === 0) {
      return { applied: 0, currentVersion: currentDbVersion }
    }

    // 5. T-026: Auto backup before running migrations
    if (dbPath) {
      this.backupDatabase(dbPath, currentDbVersion)
    }

    // 6. Run pending migrations
    const insertStmt = db.prepare(
      'INSERT INTO schema_migration (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)',
    )

    for (const m of pending) {
      db.exec(m.sql)
      const checksum = computeChecksum(m.sql)
      insertStmt.run(m.version, m.name, checksum, new Date().toISOString())
      db.pragma(`user_version = ${m.version}`)
    }

    return { applied: pending.length, currentVersion: this.maxVersion }
  }
}
