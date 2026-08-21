/**
 * Test Environment Dialects for 7 engines + SQLite
 * T010, research.md §R-3 & §R-4.
 *
 * Mọi dynamic identifier BẮT BUỘC dùng quoteIdentifier từ @corvus/sql (Rule 3.2, Cấm 4).
 */
import os from 'node:os'
import path from 'node:path'
import { quoteIdentifier } from '@corvus/sql'

export type EngineFamily =
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'mssql'
  | 'oracle'
  | 'mongodb'
  | 'redis'
  | 'sqlite'

export interface TestEnvDialect {
  readonly engineFamily: EngineFamily
  /**
   * Sinh các câu SQL tạo không gian tạm cho một lần chạy test
   */
  createSpaceSql?: (spaceName: string) => string[]
  /**
   * Sinh các câu SQL dọn sạch không gian tạm khi test kết thúc
   */
  dropSpaceSql?: (spaceName: string) => string[]
  /**
   * Câu SQL truy vấn danh sách không gian mồ côi (bắt đầu bằng corvus_t_)
   */
  listOrphanSpacesSql?: () => string
  /**
   * Câu truy vấn kiểm tra bảng marker an toàn (SR-005)
   */
  checkMarkerSql?: () => string
  /**
   * Tiền tố Redis cho không gian test
   */
  getRedisPrefix?: (spaceName: string) => string
  /**
   * Đường dẫn tệp SQLite tạm cho không gian test
   */
  getTempSqlitePath?: (spaceName: string) => string
}

export const POSTGRES_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'postgres',
  createSpaceSql: (space) => [
    `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(space, 'postgres')}`,
  ],
  dropSpaceSql: (space) => [
    `DROP SCHEMA IF EXISTS ${quoteIdentifier(space, 'postgres')} CASCADE`,
  ],
  listOrphanSpacesSql: () =>
    `SELECT schema_name AS space_name FROM information_schema.schemata WHERE schema_name LIKE 'corvus_t_%'`,
  checkMarkerSql: () =>
    `SELECT key, value, seed_version FROM corvus_dev.corvus_env_marker WHERE key = 'corvus_dev'`,
}

export const MYSQL_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'mysql',
  createSpaceSql: (space) => [
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(space, 'mysql')} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  ],
  dropSpaceSql: (space) => [
    `DROP DATABASE IF EXISTS ${quoteIdentifier(space, 'mysql')}`,
  ],
  listOrphanSpacesSql: () =>
    `SELECT schema_name AS space_name FROM information_schema.schemata WHERE schema_name LIKE 'corvus_t_%'`,
  checkMarkerSql: () =>
    `SELECT \`key\`, \`value\`, seed_version FROM corvus_dev.corvus_env_marker WHERE \`key\` = 'corvus_dev'`,
}

export const MARIADB_TEST_DIALECT: TestEnvDialect = {
  ...MYSQL_TEST_DIALECT,
  engineFamily: 'mariadb',
}

export const MSSQL_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'mssql',
  createSpaceSql: (space) => {
    const escaped = space.replace(/'/g, "''")
    const quoted = quoteIdentifier(space, 'mssql')
    return [
      `IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = '${escaped}') EXEC('CREATE SCHEMA ${quoted}');`,
    ]
  },
  dropSpaceSql: (space) => {
    const escaped = space.replace(/'/g, "''")
    const quoted = quoteIdentifier(space, 'mssql')
    return [
      `IF EXISTS (SELECT * FROM sys.schemas WHERE name = '${escaped}') EXEC('DROP SCHEMA ${quoted}');`,
    ]
  },
  listOrphanSpacesSql: () =>
    `SELECT name AS space_name FROM sys.schemas WHERE name LIKE 'corvus_t_%'`,
  checkMarkerSql: () =>
    `SELECT [key], [value], seed_version FROM corvus_dev.corvus_env_marker WHERE [key] = 'corvus_dev'`,
}

export const ORACLE_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'oracle',
  createSpaceSql: (space) => [
    `BEGIN EXECUTE IMMEDIATE 'CREATE USER ${quoteIdentifier(space, 'oracle')} IDENTIFIED BY CorvusDevPass123#'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1920 THEN RAISE; END IF; END;`,
  ],
  dropSpaceSql: (space) => [
    `BEGIN EXECUTE IMMEDIATE 'DROP USER ${quoteIdentifier(space, 'oracle')} CASCADE'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -1918 THEN RAISE; END IF; END;`,
  ],
  listOrphanSpacesSql: () =>
    `SELECT username AS space_name FROM all_users WHERE username LIKE 'CORVUS_T_%'`,
  checkMarkerSql: () =>
    `SELECT "key", "value", seed_version FROM corvus_env_marker WHERE "key" = 'corvus_dev'`,
}

export const MONGODB_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'mongodb',
  createSpaceSql: () => [],
  dropSpaceSql: (space) => [`use ${space}`, `db.dropDatabase()`],
}

export const REDIS_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'redis',
  getRedisPrefix: (space) => `corvus:t:${space}:`,
}

export const SQLITE_TEST_DIALECT: TestEnvDialect = {
  engineFamily: 'sqlite',
  getTempSqlitePath: (space) =>
    path.join(os.tmpdir(), `corvus-t-${space}-${process.pid}.db`),
}

export const TEST_ENV_DIALECTS: Record<EngineFamily, TestEnvDialect> = {
  postgres: POSTGRES_TEST_DIALECT,
  mysql: MYSQL_TEST_DIALECT,
  mariadb: MARIADB_TEST_DIALECT,
  mssql: MSSQL_TEST_DIALECT,
  oracle: ORACLE_TEST_DIALECT,
  mongodb: MONGODB_TEST_DIALECT,
  redis: REDIS_TEST_DIALECT,
  sqlite: SQLITE_TEST_DIALECT,
}

export function getTestEnvDialect(family: EngineFamily): TestEnvDialect {
  const dialect = TEST_ENV_DIALECTS[family]
  if (!dialect) {
    throw new Error(`Không tìm thấy TestEnvDialect cho engine family: ${family}`)
  }
  return dialect
}
