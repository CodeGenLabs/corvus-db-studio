import { describe, expect, it } from 'vitest'
import {
  generateUserSql,
  generateGrantSql,
} from '../security-generator'
import { buildSchemaSearchSql } from '../schema-search'
import { SubqueryBuilder } from '../subquery-builder'
import { buildSelect } from '../builder'
import { generateChangeSql } from '../change-order'
import { generateCreateTable, generateAlterTable, generateDropTable } from '../ddl'
import { buildExtendedInsertSql, buildPgCopyStdinHeader } from '../fast-path-import'
import { generateImportSql } from '../import-parser'
import { MultiExportManager } from '../multi-export'
import { quoteIdentifier, quoteLiteral } from '../dialect'

describe('SQL Injection Prevention (T-B01)', () => {
  const MALICIOUS_PAYLOAD = 'admin\'; DROP TABLE users; --'
  const MALICIOUS_IDENT = 'users"; DROP TABLE secrets; --'

  describe('security-generator.ts', () => {
    it('safely escapes user definitions in PostgreSQL', () => {
      const sql = generateUserSql(
        'create',
        {
          username: MALICIOUS_IDENT,
          password: MALICIOUS_PAYLOAD,
        },
        'postgres',
      )
      // Must quote identifier with double quotes and password with single quotes
      expect(sql).toContain('"users""; DROP TABLE secrets; --"')
      expect(sql).toContain("'admin''; DROP TABLE users; --'")
      expect(sql.startsWith('CREATE ROLE ')).toBe(true)
      expect(sql.endsWith(';')).toBe(true)
    })

    it('safely escapes user definitions in MySQL', () => {
      const sql = generateUserSql(
        'create',
        {
          username: MALICIOUS_PAYLOAD,
          host: '10.0.0.1\'; DROP TABLE x; --',
          password: MALICIOUS_PAYLOAD,
        },
        'mysql',
      )
      expect(sql).toContain("'admin''; DROP TABLE users; --'@'10.0.0.1''; DROP TABLE x; --'")
      expect(sql).toContain("IDENTIFIED BY 'admin''; DROP TABLE users; --'")
    })

    it('safely escapes GRANT / REVOKE in PostgreSQL and MySQL', () => {
      const grantPg = generateGrantSql(
        {
          privileges: ['SELECT', 'INSERT'],
          database: MALICIOUS_IDENT,
          table: 'secret_table',
          grantee: MALICIOUS_IDENT,
        },
        'postgres',
      )
      expect(grantPg).toContain('"users""; DROP TABLE secrets; --"."secret_table"')
      expect(grantPg).toContain('TO "users""; DROP TABLE secrets; --"')

      const grantMy = generateGrantSql(
        {
          privileges: ['SELECT'],
          database: 'shop',
          table: 'orders',
          grantee: MALICIOUS_PAYLOAD,
        },
        'mysql',
      )
      expect(grantMy).toContain("'admin''; DROP TABLE users; --'@'%'")
    })
  })

  describe('schema-search.ts', () => {
    it('safely quotes table names and search terms against SQL injection', () => {
      const stmts = buildSchemaSearchSql(
        {
          term: MALICIOUS_PAYLOAD,
          mode: 'data',
        },
        'public',
        [{ name: MALICIOUS_IDENT, columns: ['id', 'email'] }],
        'postgres',
      )

      expect(stmts).toHaveLength(1)
      const sql = stmts[0]!
      // Table literal in SELECT list must be escaped as string literal
      expect(sql).toContain("'users\"; DROP TABLE secrets; --' AS table_name")
      // Identifier in FROM must be double quoted
      expect(sql).toContain('"public"."users""; DROP TABLE secrets; --"')
      // Term in WHERE must be properly escaped
      expect(sql).toContain("LIKE '%admin''; DROP TABLE users; --%'")
    })
  })

  describe('subquery-builder.ts', () => {
    it('safely quotes alias and inner query in SubqueryBuilder', () => {
      const sub = SubqueryBuilder.buildFromSubquery(
        {
          alias: MALICIOUS_IDENT,
          innerQuery: {
            select: ['id', 'username'],
            from: 'my_table',
          },
        },
        'postgres',
      )
      expect(sub).toContain('AS "users""; DROP TABLE secrets; --"')
      expect(sub).toContain('FROM "my_table"')
    })
  })

  describe('builder.ts (Query Builder)', () => {
    it('safely escapes tables, fields, aliases, and where literals', () => {
      const sql = buildSelect(
        {
          tables: [{ name: MALICIOUS_IDENT, alias: 't1' }],
          fields: [{ name: 'col1', table: MALICIOUS_IDENT, alias: 'a1' }],
          where: [
            {
              field: 'name',
              table: MALICIOUS_IDENT,
              op: '=',
              value: MALICIOUS_PAYLOAD,
            },
          ],
        },
        'postgres',
      )
      expect(sql).toContain('FROM "users""; DROP TABLE secrets; --" AS "t1"')
      expect(sql).toContain('WHERE "users""; DROP TABLE secrets; --"."name" = \'admin\'\'; DROP TABLE users; --\'')
    })
  })

  describe('change-order.ts', () => {
    it('safely quotes tables, columns, and pk values in DML statements', () => {
      const dml = generateChangeSql(
        {
          type: 'update',
          tableName: MALICIOUS_IDENT,
          pkColumn: 'id',
          pkValue: MALICIOUS_PAYLOAD,
          data: { status: MALICIOUS_PAYLOAD },
          oldData: { id: MALICIOUS_PAYLOAD, status: 'active' },
        },
        'postgres',
      )
      expect(dml).toContain('UPDATE "users""; DROP TABLE secrets; --"')
      expect(dml).toContain("\"id\" = 'admin''; DROP TABLE users; --'")
      expect(dml).toContain("\"status\" = 'admin''; DROP TABLE users; --'")
    })
  })

  describe('ddl.ts (DDL generation)', () => {
    it('safely quotes identifiers in CREATE and ALTER TABLE', () => {
      const create = generateCreateTable(
        {
          name: MALICIOUS_IDENT,
          indexes: [],
          foreignKeys: [],
          fields: [
            {
              id: 'f1',
              name: 'col"1',
              type: 'varchar',
              length: '50',
              nullable: false,
              isPrimaryKey: true,
            },
          ],
        },
        'postgres',
      )
      expect(create.statements[0]).toContain('CREATE TABLE "users""; DROP TABLE secrets; --"')
      expect(create.statements[0]).toContain('"col""1" VARCHAR(50)')
      expect(create.statements[0]).toContain('PRIMARY KEY ("col""1")')

      const alter = generateAlterTable(
        {
          name: MALICIOUS_IDENT,
          indexes: [],
          foreignKeys: [],
          fields: [{ id: 'f1', name: 'old_col', type: 'varchar', nullable: false, isPrimaryKey: true }],
        },
        {
          name: MALICIOUS_IDENT,
          indexes: [],
          foreignKeys: [],
          fields: [{ id: 'f1', name: MALICIOUS_IDENT, type: 'varchar', nullable: false, isPrimaryKey: true }],
        },
        'postgres',
      )
      expect(alter.statements[0]).toContain('ALTER TABLE "users""; DROP TABLE secrets; --" RENAME COLUMN "old_col" TO "users""; DROP TABLE secrets; --";')

      const drop = generateDropTable(MALICIOUS_IDENT, 'postgres')
      expect(drop).toBe('DROP TABLE "users""; DROP TABLE secrets; --";')
    })
  })

  describe('fast-path-import.ts', () => {
    it('safely escapes extended INSERT and COPY STDIN header', () => {
      const inserts = buildExtendedInsertSql(
        MALICIOUS_IDENT,
        ['col1', 'col2'],
        [{ col1: MALICIOUS_PAYLOAD, col2: 123 }],
        'postgres',
      )
      expect(inserts[0]).toContain('INSERT INTO "users""; DROP TABLE secrets; --"')
      expect(inserts[0]).toContain("'admin''; DROP TABLE users; --'")

      const copyHeader = buildPgCopyStdinHeader(MALICIOUS_IDENT, ['c1', 'c2'])
      expect(copyHeader).toContain('COPY "users""; DROP TABLE secrets; --"')
    })
  })

  describe('import-parser.ts & multi-export.ts', () => {
    it('safely quotes table and field values in import SQL', () => {
      const sqls = generateImportSql(
        MALICIOUS_IDENT,
        [
          { sourceField: 'c0', targetField: 'f0', targetType: 'varchar', isKey: true },
          { sourceField: 'c1', targetField: 'f1', targetType: 'varchar' },
        ],
        [[MALICIOUS_PAYLOAD, MALICIOUS_PAYLOAD]],
        'append',
        'postgres',
      )
      expect(sqls[0]).toContain('INSERT INTO "users""; DROP TABLE secrets; --"')
      expect(sqls[0]).toContain("'admin''; DROP TABLE users; --'")
    })

    it('safely quotes multi-export merged SQL', () => {
      const merged = MultiExportManager.generateMergedSql([
        {
          name: MALICIOUS_IDENT,
          type: 'table',
          columns: ['id'],
          rows: [{ id: MALICIOUS_PAYLOAD }],
        },
      ])
      expect(merged).toContain('INSERT INTO "users""; DROP TABLE secrets; --"')
      expect(merged).toContain("'admin''; DROP TABLE users; --'")
    })
  })

  describe('dialect.ts utilities', () => {
    it('quoteIdentifier escapes double quotes in postgres/sqlite and backticks in mysql', () => {
      expect(quoteIdentifier('my"table', 'postgres')).toBe('"my""table"')
      expect(quoteIdentifier('my"table', 'sqlite')).toBe('"my""table"')
      expect(quoteIdentifier('my`table', 'mysql')).toBe('`my``table`')
      expect(quoteIdentifier('my]table', 'mssql')).toBe('[my]]table]')
    })

    it('quoteLiteral escapes single quotes and backslashes properly', () => {
      expect(quoteLiteral("it's a test", 'postgres')).toBe("'it''s a test'")
      expect(quoteLiteral("path\\with'quote", 'mysql')).toBe("'path\\\\with''quote'")
    })
  })
})
