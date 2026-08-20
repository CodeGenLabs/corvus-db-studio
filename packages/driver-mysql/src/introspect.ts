import { corvusError, type ColumnMeta, type ForeignKeyMeta, type IndexMeta, type TableMeta } from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import { quoteIdentifier } from '@corvus/sql'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import { mysqlErrorToCorvus } from './errors'

interface SchemaRow extends RowDataPacket {
  SCHEMA_NAME: string
}

interface TableRow extends RowDataPacket {
  name: string
  table_type: string
  est_rows: number | null
  total_bytes: number | null
  engine_name: string | null
  modified_time: string | null
  comment: string | null
}

interface TableInfoRow extends RowDataPacket {
  TABLE_NAME: string
  TABLE_TYPE: string
  TABLE_ROWS: number | null
  DATA_LENGTH: number | null
  INDEX_LENGTH: number | null
  ENGINE: string | null
  TABLE_COMMENT: string | null
}

interface ColumnRow extends RowDataPacket {
  COLUMN_NAME: string
  DATA_TYPE: string
  COLUMN_TYPE: string
  IS_NULLABLE: string
  COLUMN_DEFAULT: string | null
  COLUMN_KEY: string
  EXTRA: string
  COLUMN_COMMENT: string
  ORDINAL_POSITION: number
}

interface IndexRow extends RowDataPacket {
  INDEX_NAME: string
  COLUMN_NAME: string
  NON_UNIQUE: number
  INDEX_TYPE: string
  SEQ_IN_INDEX: number
}

interface FkRow extends RowDataPacket {
  CONSTRAINT_NAME: string
  COLUMN_NAME: string
  REFERENCED_TABLE_NAME: string
  REFERENCED_COLUMN_NAME: string
  UPDATE_RULE: string | null
  DELETE_RULE: string | null
}

interface DdlRow extends RowDataPacket {
  'Create Table'?: string
  'Create View'?: string
}

/**
 * Introspector cho MySQL / MariaDB (driver-spi.md §3).
 *
 * Nguyên tắc vàng:
 * 1. MySQL database ≡ schema -> `listSchemas()` luôn trả mảng rỗng `[]` (BẪY 3).
 * 2. Mọi truy vấn information_schema PHẢI lọc bằng `WHERE TABLE_SCHEMA = ?` (BẪY 5: không N+1, tốc độ ≤ 800ms).
 * 3. Sinh SQL an toàn qua quoteIdentifier hoặc param binding.
 */
export class MysqlIntrospector implements Introspector {
  constructor(
    private readonly pool: Pool,
    private readonly defaultDatabase?: string,
  ) {}

  async listDatabases(): Promise<string[]> {
    try {
      const [rows] = await this.pool.query<SchemaRow[]>(
        `SELECT SCHEMA_NAME
         FROM information_schema.SCHEMATA
         WHERE SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
         ORDER BY SCHEMA_NAME`,
      )
      return rows.map((r) => r.SCHEMA_NAME)
    } catch (err) {
      throw mysqlErrorToCorvus(err)
    }
  }

  /**
   * MySQL không có tầng schema độc lập. Database chính là schema.
   * Bắt buộc trả mảng rỗng để UI không vẽ lặp 2 tầng (BẪY 3 · capability-matrix.md §1).
   */
  async listSchemas(_database?: string): Promise<string[]> {
    return []
  }

  async listObjects(opts: { database?: string; schema?: string; kind?: string }): Promise<
    Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>
  > {
    const targetDb = opts.database ?? opts.schema ?? this.defaultDatabase
    if (!targetDb) {
      return []
    }

    try {
      if (opts.kind === 'procedure' || opts.kind === 'function') {
        const [rows] = await this.pool.query<RowDataPacket[]>(
          `SELECT ROUTINE_NAME AS name, ROUTINE_TYPE AS kind, ROUTINE_COMMENT AS comment
           FROM information_schema.ROUTINES
           WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = ?
           ORDER BY ROUTINE_NAME`,
          [targetDb, opts.kind.toUpperCase()],
        )
        return rows.map((r) => ({
          name: String(r.name),
          kind: String(r.kind).toLowerCase(),
        }))
      }

      if (opts.kind === 'trigger') {
        const [rows] = await this.pool.query<RowDataPacket[]>(
          `SELECT TRIGGER_NAME AS name
           FROM information_schema.TRIGGERS
           WHERE TRIGGER_SCHEMA = ?
           ORDER BY TRIGGER_NAME`,
          [targetDb],
        )
        return rows.map((r) => ({ name: String(r.name), kind: 'trigger' }))
      }

      if (opts.kind === 'event') {
        const [rows] = await this.pool.query<RowDataPacket[]>(
          `SELECT EVENT_NAME AS name
           FROM information_schema.EVENTS
           WHERE EVENT_SCHEMA = ?
           ORDER BY EVENT_NAME`,
          [targetDb],
        )
        return rows.map((r) => ({ name: String(r.name), kind: 'event' }))
      }

      if (opts.kind === 'index') {
        const [rows] = await this.pool.query<RowDataPacket[]>(
          `SELECT DISTINCT INDEX_NAME AS name
           FROM information_schema.STATISTICS
           WHERE TABLE_SCHEMA = ?
           ORDER BY INDEX_NAME`,
          [targetDb],
        )
        return rows.map((r) => ({ name: String(r.name), kind: 'index' }))
      }

      const [rows] = await this.pool.query<TableRow[]>(
        `SELECT TABLE_NAME AS name,
                TABLE_TYPE AS table_type,
                TABLE_ROWS AS est_rows,
                (DATA_LENGTH + INDEX_LENGTH) AS total_bytes,
                ENGINE AS engine_name,
                UPDATE_TIME AS modified_time,
                TABLE_COMMENT AS comment
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME`,
        [targetDb],
      )

      const result: Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }> = []

      for (const r of rows) {
        const kind = r.table_type === 'VIEW' || r.table_type === 'SYSTEM VIEW' ? 'view' : 'table'
        if (opts.kind && opts.kind !== kind) {
          continue
        }
        result.push({
          name: r.name,
          kind,
          rows: r.est_rows != null ? String(r.est_rows) : undefined,
          size: r.total_bytes != null ? String(r.total_bytes) : undefined,
          engine: r.engine_name ?? undefined,
          modified: r.modified_time ? String(r.modified_time) : undefined,
        })
      }

      return result
    } catch (err) {
      throw mysqlErrorToCorvus(err)
    }
  }

  async getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta> {
    const targetDb = opts.database ?? opts.schema ?? this.defaultDatabase
    if (!targetDb) {
      throw corvusError('INVALID_INPUT', 'Thiếu tên database để lấy table meta')
    }

    try {
      // 1. Kiểm tra bảng tồn tại trong information_schema.TABLES
      const [tableRows] = await this.pool.query<TableInfoRow[]>(
        `SELECT TABLE_NAME, TABLE_TYPE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, ENGINE, TABLE_COMMENT
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [targetDb, opts.table],
      )

      const tableInfo = tableRows[0]
      if (!tableInfo) {
        throw corvusError('TABLE_NOT_FOUND', `Bảng ${opts.table} không tồn tại trong database ${targetDb}`)
      }

      // 2. Lấy metadata các cột
      const [colRows] = await this.pool.query<ColumnRow[]>(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
                COLUMN_KEY, EXTRA, COLUMN_COMMENT, ORDINAL_POSITION
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [targetDb, opts.table],
      )

      const columns: ColumnMeta[] = colRows.map((r) => ({
        name: r.COLUMN_NAME,
        dataType: r.DATA_TYPE.toLowerCase(),
        nullable: r.IS_NULLABLE === 'YES',
        defaultValue: r.COLUMN_DEFAULT,
        isPrimaryKey: r.COLUMN_KEY === 'PRI',
        isAutoIncrement: (r.EXTRA ?? '').toLowerCase().includes('auto_increment'),
        comment: r.COLUMN_COMMENT || undefined,
        ordinalPosition: Number(r.ORDINAL_POSITION),
      }))

      // 3. Lấy indexes từ information_schema.STATISTICS
      const [idxRows] = await this.pool.query<IndexRow[]>(
        `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE, SEQ_IN_INDEX
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
        [targetDb, opts.table],
      )

      const indexMap = new Map<string, { columns: string[]; unique: boolean; primary: boolean; type?: string }>()
      for (const r of idxRows) {
        const existing = indexMap.get(r.INDEX_NAME)
        if (existing) {
          existing.columns.push(r.COLUMN_NAME)
        } else {
          indexMap.set(r.INDEX_NAME, {
            columns: [r.COLUMN_NAME],
            unique: r.NON_UNIQUE === 0,
            primary: r.INDEX_NAME === 'PRIMARY',
            type: r.INDEX_TYPE,
          })
        }
      }

      const indexes: IndexMeta[] = Array.from(indexMap.entries()).map(([name, idx]) => ({
        name,
        columns: idx.columns,
        unique: idx.unique,
        primary: idx.primary,
        type: idx.type,
      }))

      // 4. Lấy foreign keys
      const [fkRows] = await this.pool.query<FkRow[]>(
        `SELECT k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME,
                r.UPDATE_RULE, r.DELETE_RULE
         FROM information_schema.KEY_COLUMN_USAGE k
         LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS r
           ON k.CONSTRAINT_SCHEMA = r.CONSTRAINT_SCHEMA
          AND k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
         WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY k.ORDINAL_POSITION`,
        [targetDb, opts.table],
      )

      const foreignKeys: ForeignKeyMeta[] = fkRows.map((r) => ({
        name: r.CONSTRAINT_NAME,
        column: r.COLUMN_NAME,
        referencedTable: r.REFERENCED_TABLE_NAME,
        referencedColumn: r.REFERENCED_COLUMN_NAME,
        onUpdate: r.UPDATE_RULE ?? undefined,
        onDelete: r.DELETE_RULE ?? undefined,
      }))

      const totalSize =
        tableInfo.DATA_LENGTH != null || tableInfo.INDEX_LENGTH != null
          ? (Number(tableInfo.DATA_LENGTH) || 0) + (Number(tableInfo.INDEX_LENGTH) || 0)
          : undefined

      return {
        name: opts.table,
        schema: undefined,
        columns,
        indexes,
        foreignKeys,
        rowCount: tableInfo.TABLE_ROWS != null ? Number(tableInfo.TABLE_ROWS) : undefined,
        sizeBytes: totalSize,
        engine: tableInfo.ENGINE ?? undefined,
        comment: tableInfo.TABLE_COMMENT || undefined,
      }
    } catch (err) {
      throw mysqlErrorToCorvus(err)
    }
  }

  async getDdl(opts: { database?: string; schema?: string; name: string; kind?: string }): Promise<string> {
    const targetDb = opts.database ?? opts.schema ?? this.defaultDatabase
    if (!targetDb) {
      throw corvusError('INVALID_INPUT', 'Thiếu database để lấy DDL')
    }

    try {
      const quotedDb = quoteIdentifier(targetDb, 'mysql')
      const quotedName = quoteIdentifier(opts.name, 'mysql')
      const isView = opts.kind === 'view'
      const showCmd = isView ? 'SHOW CREATE VIEW' : 'SHOW CREATE TABLE'

      const [rows] = await this.pool.query<DdlRow[]>(`${showCmd} ${quotedDb}.${quotedName}`)
      const row = rows[0]
      if (!row) {
        throw corvusError('TABLE_NOT_FOUND', `Không tìm thấy ${opts.name}`)
      }
      return (row['Create Table'] ?? row['Create View'] ?? '') as string
    } catch (err) {
      throw mysqlErrorToCorvus(err)
    }
  }
}
