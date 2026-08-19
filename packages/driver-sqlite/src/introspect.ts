import { corvusError, type TableMeta } from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import { sqliteErrorToCorvus } from './errors'

/**
 * Chỉ những gì driver này dùng từ `better-sqlite3`. Khai hẹp như vậy để `introspect.ts`
 * test được bằng một db giả, và để không kéo `@types/better-sqlite3` vào chữ ký công khai.
 */
export interface SqliteHandle {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[]
    get(...params: unknown[]): unknown
  }
}

/**
 * Bảng nội bộ của SQLite (`sqlite_master`, `sqlite_sequence`, `sqlite_stat1`…) — không bao
 * giờ hiện cho người dùng.
 *
 * Lọc bằng `substr()` chứ không bằng `LIKE 'sqlite_%'`: trong LIKE, `_` là ký tự đại diện
 * cho MỘT ký tự bất kỳ, nên mẫu đó cũng khớp `sqliteXfoo` và sẽ ẩn oan bảng của người dùng.
 * Bản dùng LIKE kèm ESCAPE thì đúng nhưng khó đọc và dễ sai khi sửa về sau.
 */
const INTERNAL_PREFIX = 'sqlite_'

interface MasterRow {
  name: string
  type: string
  sql: string | null
}

interface TableInfoRow {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

interface IndexRow {
  idx_name: string
  is_unique: number
  origin: string
  col_name: string | null
  seqno: number
}

interface FkRow {
  id: number
  seq: number
  table: string
  from: string
  to: string | null
  on_update: string
  on_delete: string
}

/**
 * Introspector cho SQLite.
 *
 * Điểm khác biệt so với PostgreSQL đáng ghi lại: mọi metadata của SQLite nằm trong `PRAGMA`,
 * mà `PRAGMA` KHÔNG nhận tham số bind. Nếu dùng `PRAGMA table_info("<tên>")` thì tên bảng
 * phải nhúng vào chuỗi SQL — đúng cái mà security.md §7 cấm. Cách thoát: dùng **hàm bảng**
 * `pragma_table_info(?)` (có từ SQLite 3.16), nhận bind param bình thường. Nhờ vậy file này
 * không có một chỗ ghép chuỗi SQL nào.
 */
export class SqliteIntrospector implements Introspector {
  constructor(private readonly db: SqliteHandle) {}

  /**
   * SQLite không có tầng "database" theo nghĩa server. `PRAGMA database_list` trả về
   * `main`, `temp` và mọi tệp đã `ATTACH` — đó là thứ gần nhất với khái niệm database và
   * là thứ cây điều hướng cần.
   */
  async listDatabases(): Promise<string[]> {
    try {
      const rows = this.db.prepare('SELECT name FROM pragma_database_list').all() as Array<{ name: string }>
      return rows.map((r) => r.name).filter((n) => n !== 'temp')
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }
  }

  /**
   * SQLite KHÔNG có tầng schema. Trả mảng rỗng, tuyệt đối không trả lại danh sách database
   * cho có: cây điều hướng đọc mảng rỗng là bỏ hẳn một tầng, còn nếu trả database thì nó
   * hiện lặp hai tầng giống nhau (capability-matrix.md §1).
   */
  async listSchemas(_database?: string): Promise<string[]> {
    return []
  }

  async listObjects(opts: {
    database?: string
    schema?: string
    kind?: string
  }): Promise<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>> {
    try {
      const rows = this.db
        .prepare(
          `SELECT name, type FROM sqlite_master
            WHERE type IN ('table', 'view')
              AND substr(name, 1, length(?)) <> ?
            ORDER BY type, name`,
        )
        .all(INTERNAL_PREFIX, INTERNAL_PREFIX) as Array<{ name: string; type: string }>

      const mapped = rows.map((r) => ({ name: r.name, kind: r.type === 'view' ? 'view' : 'table' }))
      return opts.kind ? mapped.filter((o) => o.kind === opts.kind) : mapped
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }
  }

  async getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta> {
    const table = opts.table
    try {
      const cols = this.db
        .prepare('SELECT cid, name, type, "notnull", dflt_value, pk FROM pragma_table_info(?)')
        .all(table) as TableInfoRow[]

      // pragma_table_info trên bảng không tồn tại trả 0 dòng chứ không ném — phải tự dựng
      // lỗi, nếu không UI hiện một bảng rỗng và người dùng tưởng bảng thật sự không có cột.
      if (cols.length === 0) {
        throw corvusError('TABLE_NOT_FOUND', `Không tìm thấy bảng '${table}'`)
      }

      const master = this.db
        .prepare(`SELECT name, type, sql FROM sqlite_master WHERE name = ?`)
        .get(table) as MasterRow | undefined

      const pkColumns = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name)

      const indexRows = this.db
        .prepare(
          `SELECT il.name AS idx_name, il."unique" AS is_unique, il.origin AS origin,
                  ii.name AS col_name, ii.seqno AS seqno
             FROM pragma_index_list(?) il
             LEFT JOIN pragma_index_info(il.name) ii
             ORDER BY il.name, ii.seqno`,
        )
        .all(table) as IndexRow[]

      const byIndex = new Map<string, { unique: boolean; origin: string; columns: string[] }>()
      for (const r of indexRows) {
        let entry = byIndex.get(r.idx_name)
        if (!entry) {
          entry = { unique: r.is_unique === 1, origin: r.origin, columns: [] }
          byIndex.set(r.idx_name, entry)
        }
        // col_name là null với index trên biểu thức — giữ chỗ bằng '(expr)' để số cột đúng.
        entry.columns.push(r.col_name ?? '(expr)')
      }

      const indexes = [...byIndex].map(([name, e]) => ({
        name,
        columns: e.columns,
        unique: e.unique,
        primary: e.origin === 'pk',
        type: 'btree',
      }))

      // `INTEGER PRIMARY KEY` là bí danh của rowid nên SQLite KHÔNG tạo index riêng cho nó
      // → pragma_index_list không có dòng origin='pk'. Không bù vào đây thì mọi bảng dùng
      // khoá chính tự tăng đều báo "không có primary key".
      if (pkColumns.length > 0 && !indexes.some((i) => i.primary)) {
        indexes.unshift({
          name: `${table}_pk`,
          columns: pkColumns,
          unique: true,
          primary: true,
          type: 'rowid',
        })
      }

      const fkRows = this.db
        .prepare(
          `SELECT id, seq, "table", "from", "to", on_update, on_delete
             FROM pragma_foreign_key_list(?) ORDER BY id, seq`,
        )
        .all(table) as FkRow[]

      const foreignKeys = fkRows.map((r) => ({
        // SQLite không đặt tên cho khoá ngoại; dựng tên ổn định để UI có khoá React và
        // để hai lần gọi liên tiếp cho ra cùng một tên.
        name: `fk_${table}_${r.from}`,
        column: r.from,
        referencedTable: r.table,
        // `to` là null khi FK trỏ tới khoá chính ngầm của bảng đích.
        referencedColumn: r.to ?? 'rowid',
        onUpdate: r.on_update,
        onDelete: r.on_delete,
      }))

      return {
        name: table,
        columns: cols.map((c) => ({
          name: c.name,
          dataType: c.type === '' ? 'BLOB' : c.type,
          nullable: c.notnull === 0,
          defaultValue: c.dflt_value,
          isPrimaryKey: c.pk > 0,
          // SQLite chỉ có AUTOINCREMENT trên đúng một cột INTEGER PRIMARY KEY, và dấu vết
          // duy nhất là từ khoá đó nằm trong DDL gốc.
          isAutoIncrement:
            c.pk === 1 &&
            /\bINTEGER\b/i.test(c.type) &&
            (master?.sql ?? '').toUpperCase().includes('AUTOINCREMENT'),
          ordinalPosition: c.cid + 1,
          // SQLite KHÔNG lưu comment cột — không có `COMMENT ON`. Để undefined thay vì
          // chuỗi rỗng, để UI phân biệt "không có" với "rỗng".
        })),
        indexes,
        foreignKeys,
        engine: 'sqlite',
      }
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }
  }

  /**
   * SQLite lưu nguyên văn câu lệnh tạo object trong `sqlite_master.sql` — DDL chính xác
   * tuyệt đối, không phải dựng lại từ metadata như PostgreSQL.
   */
  async getDdl(opts: { database?: string; schema?: string; name: string; kind: string }): Promise<string> {
    try {
      const row = this.db
        .prepare(`SELECT name, type, sql FROM sqlite_master WHERE name = ?`)
        .get(opts.name) as MasterRow | undefined

      if (!row) throw corvusError('TABLE_NOT_FOUND', `Không tìm thấy object '${opts.name}'`)
      if (row.sql === null) {
        // Index ngầm do SQLite tạo (`sqlite_autoindex_*`) không có DDL.
        throw corvusError('UNSUPPORTED_FEATURE', `Object '${opts.name}' do SQLite tạo ngầm, không có DDL`)
      }

      // Thêm dấu chấm phẩy để chuỗi trả về chạy lại được nguyên vẹn.
      return row.sql.trimEnd().endsWith(';') ? row.sql : `${row.sql};`
    } catch (err) {
      throw sqliteErrorToCorvus(err)
    }
  }
}
