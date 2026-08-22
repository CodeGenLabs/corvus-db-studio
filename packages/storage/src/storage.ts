import { corvusError } from '@corvus/contract'
import type { ConnectionProfile } from '@corvus/contract'
import { type DriverId } from '@corvus/contract'
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

/**
 * SQLite trả cột trống là `null`, còn schema zod của contract dùng `.optional()` (undefined).
 * Không chuẩn hoá thì result validation của router sẽ từ chối — lỗi thật đã gặp khi nối UI.
 */
function nullsToUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) out[k] = v === null ? undefined : v
  return out as T
}

export class WorkspaceStorage {
  private readonly db: SqliteDbLike
  private readonly dbPath?: string

  constructor(db: SqliteDbLike, dbPath?: string) {
    this.db = db
    this.dbPath = dbPath
  }

  /**
   * Owner mặc định cho bản desktop (single-user).
   *
   * Khớp `createSingleUserAuth()` của engine. Mọi bản ghi thuộc về một owner nên desktop
   * vẫn cần đúng một hàng `app_user` — nếu không thì FK `connection.owner_id` sẽ chặn.
   */
  static readonly LOCAL_OWNER_ID = 'local-owner'

  /** Tạo owner nếu chưa có. Idempotent — gọi mỗi lần khởi động cũng không sao. */
  ensureUser(id: string, username = id, displayName = username, role = 'owner'): void {
    const existingById = this.db.prepare('SELECT id FROM app_user WHERE id = ?').get(id)
    if (existingById) return

    let finalUsername = username
    const existingByUsername = this.db.prepare('SELECT id FROM app_user WHERE username = ?').get(username)
    if (existingByUsername) {
      finalUsername = `${username}_${id.replace(/[^a-zA-Z0-9]/g, '_')}`
    }

    this.db
      .prepare(
        `INSERT INTO app_user (id, username, display_name, role, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .run(id, finalUsername, displayName, role, new Date().toISOString())
  }

  /** Tạo owner mặc định của bản desktop. */
  ensureLocalOwner(): string {
    this.ensureUser(WorkspaceStorage.LOCAL_OWNER_ID, 'local', 'Local user', 'owner')
    return WorkspaceStorage.LOCAL_OWNER_ID
  }

  /** Tạo group nếu chưa có. */
  ensureGroup(ownerId: string, groupIdOrName: string, targetKind = 'connection'): string {
    const existing = this.db
      .prepare('SELECT id FROM vgroup WHERE id = ? OR (owner_id = ? AND name = ?)')
      .get(groupIdOrName, ownerId, groupIdOrName) as { id: string } | undefined
    if (existing) return existing.id

    const id = groupIdOrName
    this.db
      .prepare(
        `INSERT INTO vgroup (id, owner_id, name, target_kind, sort_order)
         VALUES (?, ?, ?, ?, 0)
         ON CONFLICT(id) DO NOTHING`,
      )
      .run(id, ownerId, groupIdOrName, targetKind)
    return id
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
        `SELECT c.id, c.name, c.driver_id, c.color, c.mode, c.group_id, g.name as group_name, c.config_json, c.tunnel_json, c.tls_json
         FROM connection c
         LEFT JOIN vgroup g ON c.group_id = g.id
         WHERE c.owner_id = ?
         ORDER BY c.sort_order ASC, c.name ASC`,
      )
      .all(ownerId) as Array<{
      id: string
      name: string
      driver_id: string
      color?: string
      mode: string
      group_id?: string
      group_name?: string
      config_json: string
    }>

    return rows.map((r) => {
      const config = JSON.parse(r.config_json || '{}')
      return nullsToUndefined({
        id: r.id,
        name: r.name,
        driverId: r.driver_id as DriverId,
        color: r.color,
        group: r.group_name || r.group_id,
        readOnly: r.mode === 'read-only',
        ...config,
      })
    })
  }

  getConnection(id: string): ConnectionProfile | undefined {
    const row = this.db
      .prepare(
        `SELECT c.id, c.name, c.driver_id, c.color, c.mode, c.group_id, g.name as group_name, c.config_json
         FROM connection c
         LEFT JOIN vgroup g ON c.group_id = g.id
         WHERE c.id = ?`,
      )
      .get(id) as
      | { id: string; name: string; driver_id: string; color?: string; mode: string; group_id?: string; group_name?: string; config_json: string }
      | undefined
    if (!row) return undefined
    const config = JSON.parse(row.config_json || '{}')
    return nullsToUndefined({
      id: row.id,
      name: row.name,
      driverId: row.driver_id as DriverId,
      color: row.color,
      readOnly: row.mode === 'read-only',
      group: row.group_name || row.group_id,
      ...config,
    })
  }

  /**
   * Thêm hoặc cập nhật profile.
   *
   * `config_json` KHÔNG BAO GIỜ chứa mật khẩu — secret nằm trong SecretVault
   * (security.md §2, bất biến 1). Hàm này loại bỏ tường minh các trường bí mật để một
   * lời gọi bất cẩn cũng không ghi được secret vào workspace.db.
   */
  upsertConnection(ownerId: string, profile: ConnectionProfile): void {
    if (ownerId === WorkspaceStorage.LOCAL_OWNER_ID) {
      this.ensureLocalOwner()
    }
    const { id, name, driverId, color, readOnly, group, ...rest } = profile

    let resolvedGroupId: string | null = null
    if (group && typeof group === 'string' && group.trim()) {
      resolvedGroupId = this.ensureGroup(ownerId, group.trim(), 'connection')
    }

    const config = { ...rest } as Record<string, unknown>
    for (const secretField of ['password', 'passphrase', 'privateKey', 'secret', 'token']) {
      delete config[secretField]
    }
    const now = new Date().toISOString()
    try {
      this.db
      .prepare(
        `INSERT INTO connection (id, owner_id, name, driver_id, color, mode, group_id, config_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, driver_id = excluded.driver_id, color = excluded.color,
           mode = excluded.mode, group_id = excluded.group_id,
           config_json = excluded.config_json, updated_at = excluded.updated_at`,
      )
      .run(
        id,
        ownerId,
        name,
        driverId,
        color ?? null,
        readOnly ? 'read-only' : 'read-write',
        resolvedGroupId,
        JSON.stringify(config),
        now,
        now,
      )
    } catch (err) {
      // FK owner_id là nguyên nhân phổ biến nhất: gọi ensureUser() trước.
      if (String(err).includes('FOREIGN KEY')) {
        throw corvusError(
          'INVALID_INPUT',
          `Không lưu được kết nối: owner '${ownerId}' chưa tồn tại. Gọi ensureUser() trước.`,
          { cause: err },
        )
      }
      throw err
    }
  }

  deleteConnection(id: string): boolean {
    const res = this.db.prepare('DELETE FROM connection WHERE id = ?').run(id)
    return res.changes > 0
  }

  getAllSettings(ownerId: string): Record<string, unknown> {
    const rows = this.db
      .prepare('SELECT key, value_json FROM setting WHERE owner_id = ?')
      .all(ownerId) as Array<{ key: string; value_json: string }>
    const result: Record<string, unknown> = {}
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value_json)
      } catch {
        result[r.key] = r.value_json
      }
    }
    return result
  }
}
