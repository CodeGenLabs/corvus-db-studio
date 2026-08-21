import type {
  ColumnMeta,
  ForeignKeyMeta,
  IndexMeta,
  TableMeta,
} from '@corvus/contract'
import { corvusError } from '@corvus/contract'
import type { Introspector } from '@corvus/driver-core'
import { quoteIdentifier } from '@corvus/sql'
import type mssql from 'mssql'

export class MssqlIntrospector implements Introspector {
  constructor(private readonly pool: mssql.ConnectionPool) {}

  async listDatabases(): Promise<string[]> {
    const res = await this.pool.request().query<{ name: string }>(`
      SELECT name
        FROM sys.databases
       WHERE state_desc = 'ONLINE'
         AND name NOT IN ('master', 'tempdb', 'model', 'msdb')
       ORDER BY name
    `)
    return res.recordset.map((r) => r.name)
  }

  async listSchemas(database?: string): Promise<string[]> {
    const quotedDbPrefix = database ? `${quoteIdentifier(database, 'mssql')}.` : ''
    const res = await this.pool.request().query<{ name: string }>(`
      SELECT name
        FROM ${quotedDbPrefix}sys.schemas
       WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest')
       ORDER BY name
    `)
    return res.recordset.map((r) => r.name)
  }

  async listObjects(opts: {
    database?: string
    schema?: string
    kind?: string
  }): Promise<Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }>> {
    const quotedDbPrefix = opts.database ? `${quoteIdentifier(opts.database, 'mssql')}.` : ''
    const schema = opts.schema ?? 'dbo'
    const kind = opts.kind

    const objects: Array<{ name: string; kind: string; rows?: string; size?: string; engine?: string; modified?: string }> = []

    // ── Tables & Views ───────────────────────────────────────────────────────
    if (!kind || kind === 'table' || kind === 'view') {
      const safeTypeFilter = kind === 'table' ? "AND o.type = 'U'" : kind === 'view' ? "AND o.type = 'V'" : "AND o.type IN ('U', 'V')"
      const q = `
        SELECT o.name,
               CASE WHEN o.type = 'U' THEN 'table' ELSE 'view' END AS kind,
               o.modify_date AS modified,
               p.rows AS [rows]
          FROM ${quotedDbPrefix}sys.objects o
          JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
          LEFT JOIN (
            SELECT object_id, SUM(rows) AS rows
              FROM ${quotedDbPrefix}sys.partitions
             WHERE index_id IN (0, 1)
             GROUP BY object_id
          ) p ON p.object_id = o.object_id
         WHERE s.name = @schema
           ${safeTypeFilter}
         ORDER BY o.name
      `
      const res = await this.pool.request().input('schema', schema).query<{
        name: string
        kind: string
        modified: Date
        rows: number | null
      }>(q)

      for (const r of res.recordset) {
        objects.push({
          name: r.name,
          kind: r.kind,
          rows: r.rows != null ? String(r.rows) : undefined,
          modified: r.modified ? r.modified.toISOString() : undefined,
        })
      }
    }

    // ── Procedures & Functions ───────────────────────────────────────────────
    if (!kind || kind === 'procedure' || kind === 'function') {
      const safeTypeFilter =
        kind === 'procedure'
          ? "AND o.type = 'P'"
          : kind === 'function'
            ? "AND o.type IN ('FN', 'IF', 'TF')"
            : "AND o.type IN ('P', 'FN', 'IF', 'TF')"
      const q = `
        SELECT o.name,
               CASE WHEN o.type = 'P' THEN 'procedure' ELSE 'function' END AS kind,
               o.modify_date AS modified
          FROM ${quotedDbPrefix}sys.objects o
          JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
         WHERE s.name = @schema
           ${safeTypeFilter}
         ORDER BY o.name
      `
      const res = await this.pool.request().input('schema', schema).query<{
        name: string
        kind: string
        modified: Date
      }>(q)

      for (const r of res.recordset) {
        objects.push({
          name: r.name,
          kind: r.kind,
          modified: r.modified ? r.modified.toISOString() : undefined,
        })
      }
    }

    // ── Triggers ─────────────────────────────────────────────────────────────
    if (!kind || kind === 'trigger') {
      const q = `
        SELECT t.name,
               t.modify_date AS modified
          FROM ${quotedDbPrefix}sys.triggers t
          JOIN ${quotedDbPrefix}sys.objects o ON o.object_id = t.parent_id
          JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
         WHERE s.name = @schema
         ORDER BY t.name
      `
      const res = await this.pool.request().input('schema', schema).query<{
        name: string
        modified: Date
      }>(q)

      for (const r of res.recordset) {
        objects.push({
          name: r.name,
          kind: 'trigger',
          modified: r.modified ? r.modified.toISOString() : undefined,
        })
      }
    }

    // ── Sequences ────────────────────────────────────────────────────
    if (!kind || kind === 'sequence') {
      try {
        const q = `
          SELECT seq.name,
                 seq.modify_date AS modified
            FROM ${quotedDbPrefix}sys.sequences seq
            JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = seq.schema_id
           WHERE s.name = @schema
           ORDER BY seq.name
        `
        const res = await this.pool.request().input('schema', schema).query<{
          name: string
          modified: Date
        }>(q)

        for (const r of res.recordset) {
          objects.push({
            name: r.name,
            kind: 'sequence',
            modified: r.modified ? r.modified.toISOString() : undefined,
          })
        }
      } catch {
        // ignore
      }
    }

    // ── Indexes ──────────────────────────────────────────────────────────────
    if (!kind || kind === 'index') {
      const q = `
        SELECT i.name,
               o.modify_date AS modified
          FROM ${quotedDbPrefix}sys.indexes i
          JOIN ${quotedDbPrefix}sys.objects o ON o.object_id = i.object_id
          JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
         WHERE s.name = @schema
           AND i.name IS NOT NULL
           AND i.is_hypothetical = 0
         ORDER BY i.name
      `
      const res = await this.pool.request().input('schema', schema).query<{
        name: string
        modified: Date
      }>(q)

      for (const r of res.recordset) {
        objects.push({
          name: r.name,
          kind: 'index',
          modified: r.modified ? r.modified.toISOString() : undefined,
        })
      }
    }

    // ── Types ────────────────────────────────────────────────────────────────
    if (!kind || kind === 'type') {
      const q = `
        SELECT t.name
          FROM ${quotedDbPrefix}sys.types t
          JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = t.schema_id
         WHERE s.name = @schema
           AND t.is_user_defined = 1
         ORDER BY t.name
      `
      const res = await this.pool.request().input('schema', schema).query<{
        name: string
      }>(q)

      for (const r of res.recordset) {
        objects.push({
          name: r.name,
          kind: 'type',
        })
      }
    }

    return objects
  }

  async getTableMeta(opts: {
    database?: string
    schema?: string
    table: string
  }): Promise<TableMeta> {
    const quotedDbPrefix = opts.database ? `${quoteIdentifier(opts.database, 'mssql')}.` : ''
    const schema = opts.schema ?? 'dbo'
    const table = opts.table

    // ── Columns ──────────────────────────────────────────────────────────────
    const colQ = `
      SELECT c.column_id AS ordinal_position,
             c.name AS column_name,
             t.name AS data_type,
             c.is_nullable,
             c.is_identity,
             c.max_length,
             c.precision,
             c.scale,
             OBJECT_DEFINITION(c.default_object_id) AS default_value,
             ep.value AS comment,
             CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS is_pk
        FROM ${quotedDbPrefix}sys.columns c
        JOIN ${quotedDbPrefix}sys.objects o ON o.object_id = c.object_id
        JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
        JOIN ${quotedDbPrefix}sys.types t ON t.user_type_id = c.user_type_id
        LEFT JOIN ${quotedDbPrefix}sys.extended_properties ep
               ON ep.major_id = o.object_id
              AND ep.minor_id = c.column_id
              AND ep.name = 'MS_Description'
        LEFT JOIN (
          SELECT cc.name AS column_name
            FROM ${quotedDbPrefix}sys.indexes i
            JOIN ${quotedDbPrefix}sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            JOIN ${quotedDbPrefix}sys.columns cc ON cc.object_id = ic.object_id AND cc.column_id = ic.column_id
            JOIN ${quotedDbPrefix}sys.objects o ON o.object_id = i.object_id
            JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
           WHERE i.is_primary_key = 1
             AND s.name = @schema
             AND o.name = @table
        ) pk ON pk.column_name = c.name
       WHERE s.name = @schema AND o.name = @table
       ORDER BY c.column_id
    `
    const colRes = await this.pool
      .request()
      .input('schema', schema)
      .input('table', table)
      .query<{
        ordinal_position: number
        column_name: string
        data_type: string
        is_nullable: boolean
        is_identity: boolean
        max_length: number
        precision: number
        scale: number
        default_value: string | null
        comment: string | null
        is_pk: number
      }>(colQ)

    if (!colRes.recordset || colRes.recordset.length === 0) {
      throw corvusError('TABLE_NOT_FOUND', `Bảng ${opts.table} không tồn tại`)
    }

    const columns: ColumnMeta[] = colRes.recordset.map((r) => ({
      name: r.column_name,
      dataType: r.data_type,
      nullable: r.is_nullable,
      defaultValue: r.default_value ?? null,
      isPrimaryKey: r.is_pk === 1,
      isAutoIncrement: r.is_identity,
      comment: r.comment ? String(r.comment) : undefined,
      ordinalPosition: r.ordinal_position,
    }))

    // ── Indexes ──────────────────────────────────────────────────────────────
    const idxQ = `
      SELECT i.name AS index_name,
             i.is_unique,
             i.is_primary_key,
             i.type_desc AS index_type,
             c.name AS column_name,
             ic.key_ordinal
        FROM ${quotedDbPrefix}sys.indexes i
        JOIN ${quotedDbPrefix}sys.objects o ON o.object_id = i.object_id
        JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
        JOIN ${quotedDbPrefix}sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        JOIN ${quotedDbPrefix}sys.columns c ON c.object_id = o.object_id AND c.column_id = ic.column_id
       WHERE s.name = @schema
         AND o.name = @table
         AND i.is_hypothetical = 0
       ORDER BY i.name, ic.key_ordinal
    `
    const idxRes = await this.pool
      .request()
      .input('schema', schema)
      .input('table', table)
      .query<{
        index_name: string
        is_unique: boolean
        is_primary_key: boolean
        index_type: string
        column_name: string
        key_ordinal: number
      }>(idxQ)

    const indexMap = new Map<string, { unique: boolean; primary: boolean; type?: string; columns: string[] }>()
    for (const r of idxRes.recordset) {
      if (!indexMap.has(r.index_name)) {
        indexMap.set(r.index_name, {
          unique: r.is_unique,
          primary: r.is_primary_key,
          type: r.index_type,
          columns: [],
        })
      }
      indexMap.get(r.index_name)?.columns.push(r.column_name)
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
      SELECT fk.name AS constraint_name,
             col1.name AS from_column,
             tab2.name AS ref_table,
             col2.name AS to_column,
             fk.delete_referential_action_desc AS on_delete,
             fk.update_referential_action_desc AS on_update
        FROM ${quotedDbPrefix}sys.foreign_keys fk
        JOIN ${quotedDbPrefix}sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
        JOIN ${quotedDbPrefix}sys.objects tab1 ON tab1.object_id = fk.parent_object_id
        JOIN ${quotedDbPrefix}sys.schemas s1 ON s1.schema_id = tab1.schema_id
        JOIN ${quotedDbPrefix}sys.columns col1 ON col1.column_id = fkc.parent_column_id AND col1.object_id = tab1.object_id
        JOIN ${quotedDbPrefix}sys.objects tab2 ON tab2.object_id = fk.referenced_object_id
        JOIN ${quotedDbPrefix}sys.schemas s2 ON s2.schema_id = tab2.schema_id
        JOIN ${quotedDbPrefix}sys.columns col2 ON col2.column_id = fkc.referenced_column_id AND col2.object_id = tab2.object_id
       WHERE s1.name = @schema AND tab1.name = @table
       ORDER BY fk.name
    `
    const fkRes = await this.pool
      .request()
      .input('schema', schema)
      .input('table', table)
      .query<{
        constraint_name: string
        from_column: string
        ref_table: string
        to_column: string
        on_delete: string
        on_update: string
      }>(fkQ)

    const foreignKeys: ForeignKeyMeta[] = fkRes.recordset.map((r) => ({
      name: r.constraint_name,
      column: r.from_column,
      referencedTable: r.ref_table,
      referencedColumn: r.to_column,
      onDelete: r.on_delete?.replace(/_/g, ' '),
      onUpdate: r.on_update?.replace(/_/g, ' '),
    }))

    // ── Table Comment ────────────────────────────────────────────────────────
    const commentQ = `
      SELECT ep.value AS comment
        FROM ${quotedDbPrefix}sys.extended_properties ep
        JOIN ${quotedDbPrefix}sys.objects o ON o.object_id = ep.major_id
        JOIN ${quotedDbPrefix}sys.schemas s ON s.schema_id = o.schema_id
       WHERE s.name = @schema AND o.name = @table AND ep.minor_id = 0 AND ep.name = 'MS_Description'
    `
    const commentRes = await this.pool
      .request()
      .input('schema', schema)
      .input('table', table)
      .query<{ comment: string | null }>(commentQ)

    const comment = commentRes.recordset[0]?.comment
      ? String(commentRes.recordset[0].comment)
      : undefined

    return {
      name: table,
      schema,
      columns,
      indexes,
      foreignKeys,
      comment,
    }
  }

  async getDdl(opts: {
    database?: string
    schema?: string
    name: string
    kind: string
  }): Promise<string> {
    const quotedDbPrefix = opts.database ? `${quoteIdentifier(opts.database, 'mssql')}.` : ''
    const schema = opts.schema ?? 'dbo'
    const name = opts.name
    const quotedSchema = quoteIdentifier(schema, 'mssql')
    const quotedName = quoteIdentifier(name, 'mssql')

    // Đối với view, procedure, function, trigger: lấy từ OBJECT_DEFINITION
    const defQ = `
      SELECT OBJECT_DEFINITION(OBJECT_ID(@fullName)) AS def
    `
    try {
      const defRes = await this.pool
        .request()
        .input('fullName', `${schema}.${name}`)
        .query<{ def: string | null }>(defQ)
      if (defRes.recordset[0]?.def) {
        return defRes.recordset[0].def
      }
    } catch {
      // ignore
    }

    // Với table: sinh CREATE TABLE DDL
    const meta = await this.getTableMeta({
      database: opts.database,
      schema: opts.schema,
      table: opts.name,
    })

    const colDefs = meta.columns.map((c) => {
      let def = `  ${quoteIdentifier(c.name, 'mssql')} ${c.dataType}`
      if (!c.nullable) def += ' NOT NULL'
      if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`
      return def
    })

    const pkCols = meta.columns.filter((c) => c.isPrimaryKey).map((c) => quoteIdentifier(c.name, 'mssql'))
    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`)
    }

    return `CREATE TABLE ${quotedDbPrefix}${quotedSchema}.${quotedName} (\n${colDefs.join(',\n')}\n);`
  }
}
