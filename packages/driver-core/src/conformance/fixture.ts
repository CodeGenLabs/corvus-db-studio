/**
 * Schema mẫu dùng chung cho conformance suite — đọc từ docker/dev-db/seed/
 * (R-5, T009: một nguồn seed duy nhất cho cả Docker và conformance fixture).
 *
 * Cố tình chứa các trường hợp dễ làm driver sai:
 *   - tên có unicode, dấu cách, và từ khoá SQL  → kiểm quoting (security.md TM-6)
 *   - NULL và chuỗi rỗng cùng tồn tại           → kiểm phân biệt (SPEC-03 FR-03.03)
 *   - bigint vượt 2^53                          → kiểm không mất chính xác
 *   - FK nhiều cột, index unique và thường
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { splitStatements } from '@corvus/sql'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const CONFORMANCE_SCHEMA = 'corvus_conf'

function getSeedRoot(): string {
  return path.resolve(__dirname, '../../../../docker/dev-db/seed')
}

function readSeed(relPath: string): string {
  const fullPath = path.join(getSeedRoot(), relPath)
  return fs.readFileSync(fullPath, 'utf-8')
}

/**
 * Fixture PostgreSQL — đọc trực tiếp từ docker/dev-db/seed/postgres/
 */
export const POSTGRES_SETUP_SQL: string = (() => {
  const schema = readSeed('postgres/01-schema.sql')
  const data = readSeed('postgres/02-data.sql')
  return (schema + '\n' + data).replace(/corvus_dev/g, CONFORMANCE_SCHEMA)
})()

/**
 * Fixture SQLite — đọc trực tiếp từ docker/dev-db/seed/sqlite/
 */
export const SQLITE_SETUP_SQL: readonly string[] = (() => {
  const schema = readSeed('sqlite/01-schema.sql')
  const data = readSeed('sqlite/02-data.sql')
  return splitStatements(schema + '\n' + data, 'sqlite')
})()

/**
 * Fixture MySQL — đọc trực tiếp từ docker/dev-db/seed/mysql/
 */
export const MYSQL_SETUP_SQL: readonly string[] = (() => {
  const schema = readSeed('mysql/01-schema.sql')
  const data = readSeed('mysql/02-data.sql')
  const full = (schema + '\n' + data)
    .replace(/CREATE DATABASE IF NOT EXISTS corvus_dev[^;]*;/gi, '')
    .replace(/USE corvus_dev;/gi, '')
  return splitStatements(full, 'mysql')
})()

/**
 * Fixture MSSQL — đọc trực tiếp từ docker/dev-db/seed/mssql/
 */
export const MSSQL_SETUP_SQL: readonly string[] = (() => {
  const schema = readSeed('mssql/01-schema.sql')
  const data = readSeed('mssql/02-data.sql')
  const full = (schema + '\n' + data)
    .replace(/corvus_dev/g, CONFORMANCE_SCHEMA)
    .replace(/IF NOT EXISTS \(SELECT \* FROM sys\.databases WHERE name = 'corvus_dev'\)\s*BEGIN\s*CREATE DATABASE corvus_dev;\s*END\s*GO/gi, '')
    .replace(/USE corvus_dev;\s*GO/gi, '')
  return splitStatements(full, 'mssql')
})()

/**
 * Fixture Oracle — đọc trực tiếp từ docker/dev-db/seed/oracle/
 */
export const ORACLE_SETUP_SQL: readonly string[] = (() => {
  const schema = readSeed('oracle/01-schema.sql')
  const data = readSeed('oracle/02-data.sql')
  return splitStatements(schema + '\n' + data, 'oracle')
})()
