import type {
  ColumnMeta,
  ForeignKeyMeta,
  IndexMeta,
  TableMeta,
} from '@corvus/contract'
import { corvusError } from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import { quoteIdentifier } from '@corvus/sql'
import type oracledb from 'oracledb'

export class OracleIntrospector implements Introspector {
  constructor(private readonly pool: oracledb.Pool) {}

  async listDatabases(): Promise<string[]> {
    let conn: oracledb.Connection | undefined
    try {
      conn = await this.pool.getConnection()
      const res = await conn.execute<{ NAME: string }>(
        'SELECT name AS "NAME" FROM v$pdbs ORDER BY name',
        [],
        { outFormat: 4002 /* OBJECT */ },
      )
      return (res.rows ?? []).map((r) => r.NAME)
    } catch {
      return []
    } finally {
      if (conn) await conn.close()
    }
  }

  async listSchemas(): Promise<string[]> {
    let conn: oracledb.Connection | undefined
    try {
      conn = await this.pool.getConnection()
      const res = await conn.execute<{ USERNAME: string }>(
        `SELECT username AS "USERNAME"
           FROM all_users
          WHERE oracle_maintained = 'N' OR username = USER
          ORDER BY username`,
        [],
        { outFormat: 4002 },
      )
      return (res.rows ?? []).map((r) => r.USERNAME)
    } catch {
      return []
    } finally {
      if (conn) await conn.close()
    }
  }

  async listObjects(opts: {
    database?: string
    schema?: string
    kind?: string
  }): Promise<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>> {
    let conn: oracledb.Connection | undefined
    try {
      conn = await this.pool.getConnection()
      const schema = (opts.schema ?? (conn as unknown as { currentSchema?: string })?.currentSchema ?? 'USER').toUpperCase()
      const kind = opts.kind

      const objects: Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }> = []

      // ── Tables & Views ───────────────────────────────────────────────────────
      if (!kind || kind === 'table' || kind === 'view' || kind === 'materializedView') {
        const safeTypeFilter =
          kind === 'table'
            ? "AND object_type = 'TABLE'"
            : kind === 'view'
              ? "AND object_type = 'VIEW'"
              : kind === 'materializedView'
                ? "AND object_type = 'MATERIALIZED VIEW'"
                : "AND object_type IN ('TABLE', 'VIEW', 'MATERIALIZED VIEW')"

        const q = `
          SELECT object_name AS NAME,
                 CASE object_type
                   WHEN 'TABLE' THEN 'table'
                   WHEN 'VIEW' THEN 'view'
                   WHEN 'MATERIALIZED VIEW' THEN 'materializedView'
                 END AS KIND,
                 last_ddl_time AS MODIFIED
            FROM all_objects
           WHERE owner = :owner
             ${safeTypeFilter}
           ORDER BY object_name
        `
        const res = await conn.execute<{ NAME: string; KIND: string; MODIFIED: Date }>(
          q,
          [schema],
          { outFormat: 4002 },
        )

        for (const r of res.rows ?? []) {
          objects.push({
            name: r.NAME,
            kind: r.KIND,
            modified: r.MODIFIED ? r.MODIFIED.toISOString() : undefined,
          })
        }
      }

      // ── Routines & Packages ──────────────────────────────────────────────────
      if (!kind || kind === 'procedure' || kind === 'function' || kind === 'package') {
        const safeTypeFilter =
          kind === 'procedure'
            ? "AND object_type = 'PROCEDURE'"
            : kind === 'function'
              ? "AND object_type = 'FUNCTION'"
              : kind === 'package'
                ? "AND object_type = 'PACKAGE'"
                : "AND object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE')"

        const q = `
          SELECT object_name AS NAME,
                 CASE object_type
                   WHEN 'PROCEDURE' THEN 'procedure'
                   WHEN 'FUNCTION' THEN 'function'
                   WHEN 'PACKAGE' THEN 'package'
                 END AS KIND,
                 last_ddl_time AS MODIFIED
            FROM all_objects
           WHERE owner = :owner
             ${safeTypeFilter}
           ORDER BY object_name
        `
        const res = await conn.execute<{ NAME: string; KIND: string; MODIFIED: Date }>(
          q,
          [schema],
          { outFormat: 4002 },
        )

        for (const r of res.rows ?? []) {
          objects.push({
            name: r.NAME,
            kind: r.KIND,
            modified: r.MODIFIED ? r.MODIFIED.toISOString() : undefined,
          })
        }
      }

      // ── Triggers, Sequences, Indexes, Types ──────────────────────────────────
      if (!kind || kind === 'trigger' || kind === 'sequence' || kind === 'index' || kind === 'type') {
        const safeTypeFilter =
          kind === 'trigger'
            ? "AND object_type = 'TRIGGER'"
            : kind === 'sequence'
              ? "AND object_type = 'SEQUENCE'"
              : kind === 'index'
                ? "AND object_type = 'INDEX'"
                : kind === 'type'
                  ? "AND object_type = 'TYPE'"
                  : "AND object_type IN ('TRIGGER', 'SEQUENCE', 'INDEX', 'TYPE')"

        const q = `
          SELECT object_name AS NAME,
                 CASE object_type
                   WHEN 'TRIGGER' THEN 'trigger'
                   WHEN 'SEQUENCE' THEN 'sequence'
                   WHEN 'INDEX' THEN 'index'
                   WHEN 'TYPE' THEN 'type'
                 END AS KIND,
                 last_ddl_time AS MODIFIED
            FROM all_objects
           WHERE owner = :owner
             ${safeTypeFilter}
           ORDER BY object_name
        `
        const res = await conn.execute<{ NAME: string; KIND: string; MODIFIED: Date }>(
          q,
          [schema],
          { outFormat: 4002 },
        )

        for (const r of res.rows ?? []) {
          objects.push({
            name: r.NAME,
            kind: r.KIND,
            modified: r.MODIFIED ? r.MODIFIED.toISOString() : undefined,
          })
        }
      }

      return objects
    } finally {
      if (conn) await conn.close()
    }
  }

  async getTableMeta(opts: {
    database?: string
    schema?: string
    table: string
  }): Promise<TableMeta> {
    let conn: oracledb.Connection | undefined
    try {
      conn = await this.pool.getConnection()
      const schema = (opts.schema ?? (conn as unknown as { currentSchema?: string })?.currentSchema ?? 'USER').toUpperCase()
      const table = opts.table

      // ── Columns ──────────────────────────────────────────────────────────────
      const colQ = `
        SELECT c.column_id AS "ORDINAL_POSITION",
               c.column_name AS "COLUMN_NAME",
               c.data_type AS "DATA_TYPE",
               CASE c.nullable WHEN 'Y' THEN 1 ELSE 0 END AS "IS_NULLABLE",
               c.data_default AS "DATA_DEFAULT",
               c.data_length AS "DATA_LENGTH",
               c.data_precision AS "DATA_PRECISION",
               c.data_scale AS "DATA_SCALE",
               cm.comments AS "COMMENT",
               CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS "IS_PK"
          FROM all_tab_columns c
          LEFT JOIN all_col_comments cm
                 ON cm.owner = c.owner
                AND cm.table_name = c.table_name
                AND cm.column_name = c.column_name
          LEFT JOIN (
            SELECT cc.column_name, con.table_name
              FROM all_constraints con
              JOIN all_cons_columns cc
                ON cc.owner = con.owner
               AND cc.constraint_name = con.constraint_name
             WHERE (con.owner = :owner OR con.owner = UPPER(:owner))
               AND (con.table_name = :tableName OR con.table_name = UPPER(:tableName))
               AND con.constraint_type = 'P'
          ) pk ON UPPER(pk.column_name) = UPPER(c.column_name) AND (pk.table_name = c.table_name OR pk.table_name = UPPER(c.table_name))
         WHERE c.owner = :owner
           AND (c.table_name = :tableName OR c.table_name = UPPER(:tableName))
         ORDER BY c.column_id
      `
      const colRes = await conn.execute<{
        ORDINAL_POSITION: number
        COLUMN_NAME: string
        DATA_TYPE: string
        IS_NULLABLE: number
        DATA_DEFAULT: string | null
        DATA_LENGTH: number
        DATA_PRECISION: number | null
        DATA_SCALE: number | null
        COMMENT: string | null
        IS_PK: number
      }>(colQ, { owner: schema, tableName: table }, { outFormat: 4002 })

      if (!colRes.rows || colRes.rows.length === 0) {
        throw corvusError('TABLE_NOT_FOUND', `Bảng ${opts.table} không tồn tại`)
      }

      const columns: ColumnMeta[] = colRes.rows.map((r) => ({
        name: r.COLUMN_NAME,
        dataType: r.DATA_TYPE,
        nullable: Number(r.IS_NULLABLE) === 1,
        defaultValue: r.DATA_DEFAULT ?? null,
        isPrimaryKey: Number(r.IS_PK) === 1,
        comment: r.COMMENT ? String(r.COMMENT) : undefined,
        ordinalPosition: Number(r.ORDINAL_POSITION),
      }))

      // ── Indexes ──────────────────────────────────────────────────────────────
      const idxQ = `
        SELECT i.index_name AS "INDEX_NAME",
               CASE i.uniqueness WHEN 'UNIQUE' THEN 1 ELSE 0 END AS "IS_UNIQUE",
               CASE WHEN pk.constraint_name IS NOT NULL THEN 1 ELSE 0 END AS "IS_PRIMARY",
               i.index_type AS "INDEX_TYPE",
               ic.column_name AS "COLUMN_NAME"
          FROM all_indexes i
          JOIN all_ind_columns ic
            ON ic.index_owner = i.owner
           AND ic.index_name = i.index_name
          LEFT JOIN all_constraints pk
            ON pk.owner = i.owner
           AND pk.table_name = i.table_name
           AND pk.index_name = i.index_name
           AND pk.constraint_type = 'P'
         WHERE (i.owner = :owner OR i.table_owner = :owner)
           AND (i.table_name = :tableName OR i.table_name = UPPER(:tableName))
         ORDER BY i.index_name, ic.column_position
      `
      const idxRes = await conn.execute<{
        INDEX_NAME: string
        IS_UNIQUE: number
        IS_PRIMARY: number
        INDEX_TYPE: string
        COLUMN_NAME: string
      }>(idxQ, { owner: schema, tableName: table }, { outFormat: 4002 })

      const indexMap = new Map<string, { unique: boolean; primary: boolean; type?: string; columns: string[] }>()
      for (const r of idxRes.rows ?? []) {
        if (!indexMap.has(r.INDEX_NAME)) {
          indexMap.set(r.INDEX_NAME, {
            unique: Number(r.IS_UNIQUE) === 1,
            primary: Number(r.IS_PRIMARY) === 1,
            type: r.INDEX_TYPE,
            columns: [],
          })
        }
        indexMap.get(r.INDEX_NAME)?.columns.push(r.COLUMN_NAME)
      }

      const indexes: IndexMeta[] = Array.from(indexMap.entries()).map(([name, val]) => ({
        name,
        unique: val.unique,
        primary: val.primary,
        type: val.type,
        columns: val.columns,
      }))

      // ── Foreign Keys ─────────────────────────────────────────────────────────
      const fkQ = `
        SELECT c.constraint_name AS "CONSTRAINT_NAME",
               cc.column_name AS "FROM_COLUMN",
               r.owner AS "REF_SCHEMA",
               r.table_name AS "REF_TABLE",
               rcc.column_name AS "TO_COLUMN",
               c.delete_rule AS "ON_DELETE"
          FROM all_constraints c
          JOIN all_cons_columns cc
            ON cc.owner = c.owner
           AND cc.constraint_name = c.constraint_name
          JOIN all_constraints r
            ON r.owner = c.r_owner
           AND r.constraint_name = c.r_constraint_name
          JOIN all_cons_columns rcc
            ON rcc.owner = r.owner
           AND rcc.constraint_name = r.constraint_name
           AND rcc.position = cc.position
         WHERE c.owner = :owner
           AND (c.table_name = :tableName OR c.table_name = UPPER(:tableName))
           AND c.constraint_type = 'R'
         ORDER BY c.constraint_name, cc.position
      `
      const fkRes = await conn.execute<{
        CONSTRAINT_NAME: string
        FROM_COLUMN: string
        REF_SCHEMA: string
        REF_TABLE: string
        TO_COLUMN: string
        ON_DELETE: string | null
      }>(fkQ, { owner: schema, tableName: table }, { outFormat: 4002 })

      const foreignKeys: ForeignKeyMeta[] = (fkRes.rows ?? []).map((r) => ({
        name: r.CONSTRAINT_NAME,
        column: r.FROM_COLUMN,
        referencedTable: r.REF_TABLE,
        referencedColumn: r.TO_COLUMN,
        onDelete: r.ON_DELETE ?? undefined,
      }))

      // ── Table Comment ────────────────────────────────────────────────────────
      const commentQ = `
        SELECT comments AS "COMMENT"
          FROM all_tab_comments
         WHERE owner = :owner
           AND (table_name = :tableName OR table_name = UPPER(:tableName))
      `
      const commentRes = await conn.execute<{ COMMENT: string | null }>(
        commentQ,
        { owner: schema, tableName: table },
        { outFormat: 4002 },
      )

      const comment = commentRes.rows?.[0]?.COMMENT
        ? String(commentRes.rows[0].COMMENT)
        : undefined

      return {
        name: table,
        schema,
        columns,
        indexes,
        foreignKeys,
        comment,
      }
    } finally {
      if (conn) await conn.close()
    }
  }

  async getDdl(opts: {
    database?: string
    schema?: string
    name: string
    kind: string
  }): Promise<string> {
    let conn: oracledb.Connection | undefined
    try {
      conn = await this.pool.getConnection()
      const schema = (opts.schema ?? (conn as unknown as { currentSchema?: string })?.currentSchema ?? 'USER').toUpperCase()
      const name = opts.name.toUpperCase()
      const kind = (opts.kind ?? 'TABLE').toUpperCase().replace(/VIEW/g, 'VIEW')

      const ddlQ = `
        SELECT DBMS_METADATA.GET_DDL(:objectType, :objectName, :owner) AS "DDL" FROM DUAL
      `
      try {
        const ddlRes = await conn.execute<{ DDL: unknown }>(
          ddlQ,
          { objectType: kind, objectName: name, owner: schema },
          { outFormat: 4002 },
        )
        const rawDdl = ddlRes.rows?.[0]?.DDL
        if (rawDdl) {
          if (typeof rawDdl === 'string') return rawDdl
          if (typeof (rawDdl as { getData?: () => Promise<string> })?.getData === 'function') {
            return await (rawDdl as { getData: () => Promise<string> }).getData()
          }
          return String(rawDdl)
        }
      } catch {
        // Fallback to table DDL generation
      }

      const meta = await this.getTableMeta({ schema, table: name })
      const quotedSchema = quoteIdentifier(schema, 'oracle')
      const quotedName = quoteIdentifier(name, 'oracle')

      const colDefs = meta.columns.map((c) => {
        let def = `  ${quoteIdentifier(c.name, 'oracle')} ${c.dataType}`
        if (!c.nullable) def += ' NOT NULL'
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`
        return def
      })

      const pkCols = meta.columns.filter((c) => c.isPrimaryKey).map((c) => quoteIdentifier(c.name, 'oracle'))
      if (pkCols.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`)
      }

      return `CREATE TABLE ${quotedSchema}.${quotedName} (\n${colDefs.join(',\n')}\n);`
    } finally {
      if (conn) await conn.close()
    }
  }
}
