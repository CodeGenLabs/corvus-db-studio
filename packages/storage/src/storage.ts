import type { ConnectionProfile } from '@corvus/contract'
import { MigrationRunner, type MigrationFile, type SqliteDbLike } from './migration'

export const INITIAL_MIGRATIONS: MigrationFile[] = [
  {
    version: 1,
    name: '0001_init',
    sql: `
      CREATE TABLE IF NOT EXISTS app_user (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT,
        oidc_subject TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'editor',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        last_login_at TEXT
      );
      CREATE TABLE IF NOT EXISTS vgroup (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        parent_id TEXT REFERENCES vgroup(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        target_kind TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS connection (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES app_user(id),
        name TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        color TEXT,
        mode TEXT NOT NULL DEFAULT 'read-write' CHECK (mode IN ('read-write','read-only')),
        group_id TEXT REFERENCES vgroup(id),
        config_json TEXT NOT NULL,
        tunnel_json TEXT,
        tls_json TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS ix_connection_owner ON connection(owner_id);
      CREATE TABLE IF NOT EXISTS connection_acl (
        connection_id TEXT NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
        principal_id TEXT NOT NULL,
        access_level TEXT NOT NULL CHECK (access_level IN ('read','write','admin')),
        PRIMARY KEY (connection_id, principal_id)
      );
      CREATE TABLE IF NOT EXISTS secret (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        connection_id TEXT,
        kind TEXT NOT NULL,
        ciphertext BLOB NOT NULL,
        iv BLOB NOT NULL,
        tag BLOB NOT NULL,
        key_version INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saved_query (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        connection_id TEXT REFERENCES connection(id) ON DELETE SET NULL,
        database_name TEXT,
        schema_name TEXT,
        name TEXT NOT NULL,
        sql TEXT NOT NULL,
        params_json TEXT,
        group_id TEXT REFERENCES vgroup(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS query_history (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        connection_id TEXT,
        sql TEXT NOT NULL,
        executed_at TEXT NOT NULL,
        duration_ms INTEGER,
        row_count INTEGER,
        outcome TEXT NOT NULL,
        error_code TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_history_owner_time ON query_history(owner_id, executed_at DESC);
      CREATE TABLE IF NOT EXISTS snippet (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        driver_id TEXT,
        shortcut TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS setting (
        owner_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value_json TEXT NOT NULL,
        PRIMARY KEY (owner_id, key)
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        ts TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        action TEXT NOT NULL,
        connection_id TEXT,
        target TEXT,
        outcome TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        level TEXT NOT NULL,
        sql TEXT,
        rows_affected INTEGER,
        client_ip TEXT,
        user_agent TEXT,
        error_message TEXT
      );
    `,
  },
]

export class WorkspaceStorage {
  private readonly db: SqliteDbLike
  private readonly dbPath?: string

  constructor(db: SqliteDbLike, dbPath?: string) {
    this.db = db
    this.dbPath = dbPath
  }

  initialize(): void {
    const runner = new MigrationRunner(INITIAL_MIGRATIONS)
    runner.run(this.db, this.dbPath)
  }

  getSetting<T = unknown>(ownerId: string, key: string, defaultValue: T): T {
    const row = this.db
      .prepare('SELECT value_json FROM setting WHERE owner_id = ? AND key = ?')
      .get(ownerId, key) as { value_json: string } | undefined
    if (!row) return defaultValue
    try {
      return JSON.parse(row.value_json) as T
    } catch {
      return defaultValue
    }
  }

  setSetting(ownerId: string, key: string, value: unknown): void {
    const json = JSON.stringify(value)
    this.db
      .prepare(
        'INSERT INTO setting (owner_id, key, value_json) VALUES (?, ?, ?) ON CONFLICT(owner_id, key) DO UPDATE SET value_json = excluded.value_json',
      )
      .run(ownerId, key, json)
  }

  listConnections(ownerId: string): ConnectionProfile[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, driver_id, color, mode, group_id, config_json, tunnel_json, tls_json FROM connection WHERE owner_id = ? ORDER BY sort_order ASC, name ASC',
      )
      .all(ownerId) as Array<{
      id: string
      name: string
      driver_id: string
      color?: string
      mode: string
      group_id?: string
      config_json: string
    }>

    return rows.map((r) => {
      const config = JSON.parse(r.config_json || '{}')
      return {
        id: r.id,
        name: r.name,
        driverId: r.driver_id as any,
        color: r.color,
        ...config,
      }
    })
  }
}
