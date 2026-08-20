import { corvusError } from '@corvus/contract'
import type { ColumnMeta, ForeignKeyMeta, IndexMeta, TableMeta } from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import { FK_ACTIONS, PG_INDEX_METHODS, quoteIdentifier, sqlKeyword } from '@corvus/sql'
import type { Pool } from 'pg'

/** Kiểu object trong `pg_class.relkind`. */
const RELKIND: Record<string, string> = {
  r: 'table',
  p: 'table', // partitioned table
  v: 'view',
  m: 'materializedView',
  f: 'table', // foreign table
  S: 'sequence',
  i: 'index',
}

const KIND_TO_RELKIND: Record<string, string[]> = {
  table: ['r', 'p', 'f'],
  view: ['v'],
  materializedView: ['m'],
  sequence: ['S'],
  index: ['i'],
}

export class PostgresIntrospector implements Introspector {
  constructor(private readonly pool: Pool) {}

  async listDatabases(): Promise<string[]> {
    const { rows } = await this.pool.query<{ datname: string }>(
      `SELECT datname FROM pg_database
       WHERE datallowconn AND NOT datistemplate
       ORDER BY datname`,
    )
    return rows.map((r) => r.datname)
  }

  async listSchemas(): Promise<string[]> {
    const { rows } = await this.pool.query<{ nspname: string }>(
      `SELECT nspname FROM pg_namespace
       WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
       ORDER BY nspname`,
    )
    return rows.map((r) => r.nspname)
  }

  /**
   * Liệt kê object trong một schema bằng **một truy vấn duy nhất** cho mỗi loại đối tượng.
   *
   * Chống N+1 (SPEC-02 FR-02 §6): tuyệt đối không gọi `getTableMeta` cho từng bảng để
   * dựng danh sách. `reltuples` là số dòng ƯỚC LƯỢNG do planner giữ — rẻ, đúng mục đích
   * cho cột "Rows"; muốn số chính xác thì người dùng bấm riêng (SPEC-03 FR-03.13).
   */
  async listObjects(opts: { database?: string; schema?: string; kind?: string }): Promise<
    Array<{ name: string; kind: string; rows?: string; size?: string; modified?: string; comment?: string }>
  > {
    const schema = opts.schema ?? 'public'

    if (opts.kind === 'procedure' || opts.kind === 'function') {
      const { rows } = await this.pool.query<{ proname: string; kind: string; comment: string | null }>(
        `SELECT p.proname,
                CASE WHEN p.prokind = 'p' THEN 'procedure' ELSE 'function' END AS kind,
                obj_description(p.oid, 'pg_proc') AS comment
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = $1
            AND (($2 = 'procedure' AND p.prokind = 'p') OR ($2 = 'function' AND p.prokind <> 'p'))
          ORDER BY p.proname`,
        [schema, opts.kind],
      )
      return rows.map((r) => ({
        name: r.proname,
        kind: r.kind,
        comment: r.comment ?? undefined,
      }))
    }

    if (opts.kind === 'trigger') {
      const { rows } = await this.pool.query<{ tgname: string; comment: string | null }>(
        `SELECT DISTINCT t.tgname,
                obj_description(t.oid, 'pg_trigger') AS comment
           FROM pg_trigger t
           JOIN pg_class c ON c.oid = t.tgrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1
            AND NOT t.tgisinternal
          ORDER BY t.tgname`,
        [schema],
      )
      return rows.map((r) => ({
        name: r.tgname,
        kind: 'trigger',
        comment: r.comment ?? undefined,
      }))
    }

    if (opts.kind === 'domain' || opts.kind === 'type') {
      const { rows } = await this.pool.query<{ typname: string; kind: string; comment: string | null }>(
        `SELECT t.typname,
                CASE WHEN t.typtype = 'd' THEN 'domain' ELSE 'type' END AS kind,
                obj_description(t.oid, 'pg_type') AS comment
           FROM pg_type t
           JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = $1
            AND (($2 = 'domain' AND t.typtype = 'd') OR ($2 = 'type' AND t.typtype = 'e'))
            AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.oid = t.typrelid AND c.relkind != 'c')
          ORDER BY t.typname`,
        [schema, opts.kind],
      )
      return rows.map((r) => ({
        name: r.typname,
        kind: r.kind,
        comment: r.comment ?? undefined,
      }))
    }

    const relkinds = opts.kind ? (KIND_TO_RELKIND[opts.kind] ?? [opts.kind]) : Object.keys(RELKIND).filter((k) => k !== 'i')

    const { rows } = await this.pool.query<{
      relname: string
      relkind: string
      est_rows: string
      total_bytes: string | null
      comment: string | null
    }>(
      `SELECT c.relname,
              c.relkind::text                                AS relkind,
              c.reltuples::bigint::text                      AS est_rows,
              pg_total_relation_size(c.oid)::text            AS total_bytes,
              obj_description(c.oid, 'pg_class')             AS comment
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
          AND c.relkind = ANY($2::char[])
        ORDER BY c.relname`,
      [schema, relkinds],
    )

    return rows.map((r) => ({
      name: r.relname,
      kind: RELKIND[r.relkind] ?? 'table',
      // reltuples = -1 nghĩa là chưa từng ANALYZE → chưa biết, đừng hiển thị "-1".
      rows: r.est_rows === '-1' ? undefined : r.est_rows,
      size: r.total_bytes ?? undefined,
      comment: r.comment ?? undefined,
    }))
  }

  /**
   * Lấy đủ metadata của một bảng: cột, khoá chính, index, khoá ngoại.
   *
   * Dùng 3 truy vấn (cột / index / FK) chứ không phải 3×N — mỗi truy vấn lấy hết một loại.
   */
  async getTableMeta(opts: { database?: string; schema?: string; table: string }): Promise<TableMeta> {
    const schema = opts.schema ?? 'public'
    const table = opts.table

    const colsPromise = this.pool.query<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string | null
      ordinal_position: number
      is_identity: string
      comment: string | null
      is_pk: boolean
    }>(
      `SELECT a.attname                                              AS column_name,
              format_type(a.atttypid, a.atttypmod)                   AS data_type,
              CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END        AS is_nullable,
              pg_get_expr(ad.adbin, ad.adrelid)                      AS column_default,
              a.attnum                                               AS ordinal_position,
              CASE WHEN a.attidentity <> '' OR pg_get_expr(ad.adbin, ad.adrelid) LIKE 'nextval%'
                   THEN 'YES' ELSE 'NO' END                          AS is_identity,
              col_description(a.attrelid, a.attnum)                  AS comment,
              COALESCE(pk.is_pk, false)                              AS is_pk
         FROM pg_attribute a
         JOIN pg_class c      ON c.oid = a.attrelid
         JOIN pg_namespace n  ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef ad   ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    LEFT JOIN (
              SELECT conrelid, unnest(conkey) AS attnum, true AS is_pk
                FROM pg_constraint WHERE contype = 'p'
         ) pk ON pk.conrelid = a.attrelid AND pk.attnum = a.attnum
        WHERE n.nspname = $1 AND c.relname = $2
          AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum`,
      [schema, table],
    )

    const idxPromise = this.pool.query<{
      index_name: string
      is_unique: boolean
      is_primary: boolean
      index_type: string
      columns: string[]
    }>(
      `SELECT i.relname                                   AS index_name,
              ix.indisunique                              AS is_unique,
              ix.indisprimary                             AS is_primary,
              am.amname                                   AS index_type,
              -- ::text la bat buoc: array_agg(attname) cho ra kieu _name (OID 1003) ma pg
              -- khong co parser -> tra ve chuoi '{col}' thay vi mang. Loi da gap khi chay
              -- conformance.
              array_agg(a.attname::text ORDER BY k.ord)   AS columns
         FROM pg_index ix
         JOIN pg_class i      ON i.oid = ix.indexrelid
         JOIN pg_class c      ON c.oid = ix.indrelid
         JOIN pg_namespace n  ON n.oid = c.relnamespace
         JOIN pg_am am        ON am.oid = i.relam
         JOIN unnest(ix.indkey) WITH ORDINALITY k(attnum, ord) ON true
         JOIN pg_attribute a  ON a.attrelid = c.oid AND a.attnum = k.attnum
        WHERE n.nspname = $1 AND c.relname = $2
        GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
        ORDER BY i.relname`,
      [schema, table],
    )

    const fkPromise = this.pool.query<{
      constraint_name: string
      column_name: string
      ref_table: string
      ref_column: string
      on_update: string
      on_delete: string
    }>(
      `SELECT con.conname                    AS constraint_name,
              att.attname                    AS column_name,
              rc.relname                     AS ref_table,
              ratt.attname                   AS ref_column,
              con.confupdtype::text          AS on_update,
              con.confdeltype::text          AS on_delete
         FROM pg_constraint con
         JOIN pg_class c       ON c.oid = con.conrelid
         JOIN pg_namespace n   ON n.oid = c.relnamespace
         JOIN unnest(con.conkey)  WITH ORDINALITY ck(attnum, ord) ON true
         JOIN unnest(con.confkey) WITH ORDINALITY fk(attnum, ord) ON fk.ord = ck.ord
         JOIN pg_attribute att  ON att.attrelid = con.conrelid  AND att.attnum = ck.attnum
         JOIN pg_class rc       ON rc.oid = con.confrelid
         JOIN pg_attribute ratt ON ratt.attrelid = con.confrelid AND ratt.attnum = fk.attnum
        WHERE con.contype = 'f' AND n.nspname = $1 AND c.relname = $2
        ORDER BY con.conname, ck.ord`,
      [schema, table],
    )

    const [cols, idx, fks] = await Promise.all([colsPromise, idxPromise, fkPromise])

    if (cols.rows.length === 0) {
      throw corvusError('TABLE_NOT_FOUND', `Không tìm thấy bảng ${schema}.${table}`)
    }

    const columns: ColumnMeta[] = cols.rows.map((r) => ({
      name: r.column_name,
      dataType: r.data_type,
      nullable: r.is_nullable === 'YES',
      defaultValue: r.column_default,
      isPrimaryKey: r.is_pk,
      isAutoIncrement: r.is_identity === 'YES',
      comment: r.comment ?? undefined,
      ordinalPosition: r.ordinal_position,
    }))

    const indexes: IndexMeta[] = idx.rows.map((r) => ({
      name: r.index_name,
      columns: r.columns,
      unique: r.is_unique,
      primary: r.is_primary,
      type: r.index_type,
    }))

    // Mã hành động của PostgreSQL: a=NO ACTION, r=RESTRICT, c=CASCADE, n=SET NULL, d=SET DEFAULT
    const FK_ACTION: Record<string, string> = {
      a: 'NO ACTION',
      r: 'RESTRICT',
      c: 'CASCADE',
      n: 'SET NULL',
      d: 'SET DEFAULT',
    }
    const foreignKeys: ForeignKeyMeta[] = fks.rows.map((r) => ({
      name: r.constraint_name,
      column: r.column_name,
      referencedTable: r.ref_table,
      referencedColumn: r.ref_column,
      onUpdate: FK_ACTION[r.on_update],
      onDelete: FK_ACTION[r.on_delete],
    }))

    return { name: table, schema, columns, indexes, foreignKeys }
  }

  /**
   * Sinh DDL cho object.
   *
   * PostgreSQL không có `SHOW CREATE TABLE`; ta dựng lại từ metadata. Bản hiện tại phủ
   * cột + PK + FK + index — đủ cho tab DDL (SPEC-02 FR-02.13). Chưa phủ: check constraint,
   * trigger, comment, partition, tablespace (T-B05).
   */
  async getDdl(opts: { database?: string; schema?: string; name: string; kind: string }): Promise<string> {
    const schema = opts.schema ?? 'public'
    if (opts.kind === 'view' || opts.kind === 'materializedView') {
      const { rows } = await this.pool.query<{ def: string }>(
        `SELECT pg_get_viewdef(c.oid, true) AS def
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND c.relname = $2`,
        [schema, opts.name],
      )
      if (rows.length === 0) throw corvusError('NOT_FOUND', `Không tìm thấy view ${schema}.${opts.name}`)
      const keyword = opts.kind === 'materializedView' ? 'MATERIALIZED VIEW' : 'VIEW'
      return `CREATE ${keyword} ${quoteIdentifier(schema)}.${quoteIdentifier(opts.name)} AS\n${rows[0]!.def}`
    }

    const meta = await this.getTableMeta({ schema, table: opts.name })
    const quotedTable = `${quoteIdentifier(schema)}.${quoteIdentifier(opts.name)}`

    const colLines = meta.columns.map((c) => {
      const parts = [quoteIdentifier(c.name), c.dataType]
      if (!c.nullable) parts.push('NOT NULL')
      if (c.defaultValue) parts.push(`DEFAULT ${c.defaultValue}`)
      return `  ${parts.join(' ')}`
    })

    const pk = meta.columns.filter((c) => c.isPrimaryKey).map((c) => quoteIdentifier(c.name))
    if (pk.length > 0) colLines.push(`  PRIMARY KEY (${pk.join(', ')})`)

    for (const fk of meta.foreignKeys) {
      colLines.push(
        `  CONSTRAINT ${quoteIdentifier(fk.name)} FOREIGN KEY (${quoteIdentifier(fk.column)}) ` +
          `REFERENCES ${quoteIdentifier(fk.referencedTable)} (${quoteIdentifier(fk.referencedColumn)})` +
          (fk.onDelete && fk.onDelete !== 'NO ACTION' ? ` ON DELETE ${sqlKeyword(fk.onDelete, FK_ACTIONS, 'NO ACTION')}` : '') +
          (fk.onUpdate && fk.onUpdate !== 'NO ACTION' ? ` ON UPDATE ${sqlKeyword(fk.onUpdate, FK_ACTIONS, 'NO ACTION')}` : ''),
      )
    }

    const statements = [`CREATE TABLE ${quotedTable} (\n${colLines.join(',\n')}\n);`]

    for (const idx of meta.indexes) {
      if (idx.primary) continue // đã nằm trong PRIMARY KEY ở trên
      const quotedCols = idx.columns.map((c) => quoteIdentifier(c)).join(', ')
      statements.push(
        `CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX ${quoteIdentifier(idx.name)} ON ${quotedTable} USING ${sqlKeyword(idx.type, PG_INDEX_METHODS, 'btree')} (${quotedCols});`,
      )
    }

    return statements.join('\n\n')
  }

  /** Số dòng ước lượng — rẻ, dùng cho cột "Rows" (SPEC-02 FR-02.10). */
  async estimateRowCount(opts: { schema?: string; table: string }): Promise<number | null> {
    const { rows } = await this.pool.query<{ est: string }>(
      `SELECT c.reltuples::bigint::text AS est
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relname = $2`,
      [opts.schema ?? 'public', opts.table],
    )
    const est = rows[0]?.est
    if (est === undefined || est === '-1') return null
    return Number(est)
  }
}
