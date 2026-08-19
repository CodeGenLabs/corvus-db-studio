import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { corvusError } from '@corvus/contract'
import type { SqliteDbLike } from './migration'
import { WorkspaceStorage } from './storage'

/**
 * Phiên bản schema mà bản app này biết. Phải khớp `maxVersion` của INITIAL_MIGRATIONS.
 * File có `user_version` LỚN HƠN số này = workspace tạo bởi bản mới hơn → từ chối mở
 * (workspace-storage.md §4 / task T-028): mở ra rồi ghi vào sẽ làm hỏng dữ liệu.
 */
export const KNOWN_SCHEMA_VERSION = 1

export interface OpenWorkspaceOptions {
  /** Đường dẫn file `workspace.db`. Thư mục cha được tạo nếu chưa có. */
  path: string
  /** Bỏ qua migration — chỉ dùng khi chỉ cần đọc. */
  readonly?: boolean
}

export interface OpenedWorkspace {
  storage: WorkspaceStorage
  db: SqliteDbLike
  close(): void
}

/**
 * Mở `workspace.db` thật bằng better-sqlite3, đặt PRAGMA và chạy migration.
 *
 * PRAGMA theo workspace-storage.md §5:
 *   - `journal_mode = WAL`  → đọc song song được khi đang ghi
 *   - `synchronous = NORMAL`→ đủ an toàn khi có WAL
 *   - `foreign_keys = ON`   → SQLite mặc định TẮT, phải bật tường minh
 *   - `busy_timeout`        → chờ thay vì lỗi SQLITE_BUSY ngay
 */
export function openWorkspace(options: OpenWorkspaceOptions): OpenedWorkspace {
  const dir = path.dirname(path.resolve(options.path))
  fs.mkdirSync(dir, { recursive: true })

  const raw = new Database(options.path, { readonly: options.readonly ?? false })

  raw.pragma('journal_mode = WAL')
  raw.pragma('synchronous = NORMAL')
  raw.pragma('foreign_keys = ON')
  raw.pragma('busy_timeout = 5000')

  const fileVersion = Number((raw.pragma('user_version', { simple: true }) as number) ?? 0)
  if (fileVersion > KNOWN_SCHEMA_VERSION) {
    raw.close()
    throw corvusError(
      'INVALID_INPUT',
      `Workspace này được tạo bởi phiên bản Corvus mới hơn (schema v${fileVersion}, bản này hiểu tới v${KNOWN_SCHEMA_VERSION}). ` +
        'Hãy nâng cấp Corvus thay vì mở bằng bản cũ.',
      { i18nKey: 'error.workspaceTooNew' },
    )
  }

  // better-sqlite3 khớp sẵn hình dạng SqliteDbLike (exec / prepare / pragma).
  const db = raw as unknown as SqliteDbLike
  const storage = new WorkspaceStorage(db, options.path)
  if (!options.readonly) storage.initialize()

  return {
    storage,
    db,
    close: () => raw.close(),
  }
}

/** Workspace trong RAM — dùng cho test và cho `transport-mock`, không ghi ra đĩa. */
export function openInMemoryWorkspace(): OpenedWorkspace {
  const raw = new Database(':memory:')
  raw.pragma('foreign_keys = ON')
  const db = raw as unknown as SqliteDbLike
  const storage = new WorkspaceStorage(db)
  storage.initialize()
  return { storage, db, close: () => raw.close() }
}
