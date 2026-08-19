import { corvusError } from '@corvus/contract'
import {
  NotImplementedConnection,
  notImplemented,
  type DatabaseDriver,
  type DriverConnection,
  type DriverContext,
  type ResolvedProfile,
} from '@corvus/driver-core'
import { SQLITE_CAPABILITIES } from './capabilities'

/**
 * Driver SQLite — CHƯA HIỆN THỰC.
 *
 * Bản trước trả dữ liệu giả hard-code. coding-rules §3.8 cấm điều đó. Xem R-06.
 *
 * Khi hiện thực:
 *   1. `better-sqlite3` (native — cần @electron/rebuild cho desktop, xem T-007)
 *   2. Introspector đọc `sqlite_master` + `PRAGMA table_info` / `index_list` / `foreign_key_list`
 *   3. `ALTER TABLE` phải sinh chuỗi tạo lại bảng 12 bước (SPEC-06 §6) — phần khó nhất
 *   4. Kiểu động: đọc `declaredType` để chọn cell editor, không suy từ giá trị
 */
export class SqliteDriver implements DatabaseDriver {
  readonly id = 'sqlite' as const
  readonly displayName = 'SQLite'
  readonly capabilities = SQLITE_CAPABILITIES

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    if (!profile.database) {
      throw corvusError('INVALID_INPUT', 'Thiếu đường dẫn tệp cho kết nối SQLite')
    }
    return notImplemented(this.id, 'connect (chưa nối better-sqlite3 — xem R-06)')
  }
}

export class SqliteConnection extends NotImplementedConnection {
  constructor() {
    super('sqlite', { raw: 'unknown', major: 0, minor: 0, patch: 0 }, SQLITE_CAPABILITIES, 'sqlite')
  }
}

export const sqliteDriver = new SqliteDriver()
