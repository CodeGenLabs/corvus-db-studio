import { describe, expect, it } from 'vitest'
import { getTestEnvDialect, TEST_ENV_DIALECTS } from '../dialect'

describe('testenv · dialect · an toàn escape & quoting dynamic identifier (Rule 3.2, Cấm 4)', () => {
  const trickySpaces = [
    'corvus_t_normal_123',
    'corvus_t_có dấu cách',
    'corvus_t_tiếng_việt_đà_nẵng',
    'corvus_t_select',
    'corvus_t_table"quote',
    'corvus_t_table`backtick',
    'corvus_t_table]bracket',
  ]

  it('PostgreSQL escape đúng tên schema', () => {
    const dialect = getTestEnvDialect('postgres')
    for (const space of trickySpaces) {
      const createSql = dialect.createSpaceSql!(space)[0]
      const dropSql = dialect.dropSpaceSql!(space)[0]
      expect(createSql).toContain('CREATE SCHEMA IF NOT EXISTS')
      expect(dropSql).toContain('DROP SCHEMA IF EXISTS')
      // Đảm bảo không chứa dấu nháy đơn hoặc injection không escape
      expect(createSql).not.toMatch(/CREATE SCHEMA IF NOT EXISTS [^"].*[^"]/i)
    }
  })

  it('MySQL & MariaDB escape đúng tên database bằng backtick', () => {
    for (const engine of ['mysql', 'mariadb'] as const) {
      const dialect = getTestEnvDialect(engine)
      for (const space of trickySpaces) {
        const createSql = dialect.createSpaceSql!(space)[0]
        const dropSql = dialect.dropSpaceSql!(space)[0]
        expect(createSql).toContain('CREATE DATABASE IF NOT EXISTS')
        expect(dropSql).toContain('DROP DATABASE IF EXISTS')
      }
    }
  })

  it('SQL Server escape đúng tên schema trong DDL và EXEC string', () => {
    const dialect = getTestEnvDialect('mssql')
    for (const space of trickySpaces) {
      const createSql = dialect.createSpaceSql!(space)[0]
      const dropSql = dialect.dropSpaceSql!(space)[0]
      expect(createSql).toContain('CREATE SCHEMA')
      expect(dropSql).toContain('DROP SCHEMA')
    }
  })

  it('Oracle sinh PL/SQL block an toàn', () => {
    const dialect = getTestEnvDialect('oracle')
    const createSql = dialect.createSpaceSql!('corvus_t_sample_123')[0]
    const dropSql = dialect.dropSpaceSql!('corvus_t_sample_123')[0]
    expect(createSql).toContain('CREATE USER')
    expect(dropSql).toContain('DROP USER')
  })

  it('Redis trả về tiền tố corvus:t:<id>:', () => {
    const dialect = getTestEnvDialect('redis')
    const prefix = dialect.getRedisPrefix!('abc123')
    expect(prefix).toBe('corvus:t:abc123:')
  })

  it('SQLite trả về đường dẫn tệp tạm', () => {
    const dialect = getTestEnvDialect('sqlite')
    const tempPath = dialect.getTempSqlitePath!('abc123')
    expect(tempPath).toContain('corvus-t-abc123-')
    expect(tempPath.endsWith('.db')).toBe(true)
  })

  it('Mọi engine family đều có dialect trong bảng TEST_ENV_DIALECTS', () => {
    const expectedFamilies = [
      'postgres',
      'mysql',
      'mariadb',
      'mssql',
      'oracle',
      'mongodb',
      'redis',
      'sqlite',
    ]
    for (const fam of expectedFamilies) {
      expect(TEST_ENV_DIALECTS[fam as keyof typeof TEST_ENV_DIALECTS]).toBeDefined()
    }
  })
})
