import type { CapabilitySet } from '@corvus/contract'
import type { ServerVersion } from '@corvus/driver-core'

/**
 * Capability CƠ SỞ của MySQL — mức cơ sở an toàn cho MySQL 5.7+ / MariaDB 10.1+.
 *
 * `narrowMysqlCapabilities()` sẽ mở rộng/thu hẹp theo phiên bản và cấu hình server THẬT
 * (SPEC-01 §7 · capability-matrix.md §8).
 * Nguyên tắc: "thà thiếu còn hơn khai khống" (driver-spi.md §2).
 */
export const MYSQL_CAPABILITIES: CapabilitySet = {
  hierarchy: {
    hasCatalogs: false,
    // MySQL database ≡ schema (BẪY 3 · capability-matrix.md §1 ghi chú 2).
    hasSchemas: false,
  },
  objects: {
    table: true,
    view: true,
    materializedView: false,
    procedure: true,
    function: true,
    package: false,
    trigger: true,
    sequence: false,
    index: true,
    domain: false,
    type: false,
    event: true,
    collection: false,
    keyspace: false,
  },
  sql: {
    parameterStyle: 'question',
    identifierQuote: '`',
    limitSyntax: 'limit-offset',
    maxIdentifierLength: 64,
    caseSensitivity: 'insensitive',
    cte: false,
    windowFunctions: false,
    returning: false,
    upsert: 'on-duplicate-key',
  },
  exec: {
    streamingCursor: true,
    multipleStatements: true,
    multipleResultSets: true,
    cancelStatement: true,
    explain: true,
    explainAnalyze: false,
    preparedStatements: true,
  },
  tx: {
    supported: true,
    savepoints: true,
    // DDL trong MySQL gây implicit commit, không transactional (capability-matrix.md §5).
    ddlTransactional: false,
    isolationLevels: 4,
  },
  tools: {
    logicalBackup: true,
    physicalBackup: true,
    userManagement: true,
    roleManagement: false,
    processMonitor: true,
    serverVariables: true,
    dataGeneration: true,
    profiling: true,
  },
}

export interface MysqlServerInfo {
  version: ServerVersion
  isMariaDb: boolean
  lowerCaseTableNames?: number
  sqlMode?: string
}

function atLeast(v: ServerVersion, major: number, minor = 0, patch = 0): boolean {
  if (v.major !== major) return v.major > major
  if (v.minor !== minor) return v.minor > minor
  return v.patch >= patch
}

export function parseMysqlVersion(raw: string, comment = ''): ServerVersion & { isMariaDb: boolean } {
  const isMariaDb = /mariadb/i.test(raw) || /mariadb/i.test(comment)
  const match = raw.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
  const major = match && match[1] ? parseInt(match[1], 10) : 0
  const minor = match && match[2] ? parseInt(match[2], 10) : 0
  const patch = match && match[3] ? parseInt(match[3], 10) : 0
  return { raw, major, minor, patch, isMariaDb }
}

/**
 * Thu hẹp / mở rộng capability theo server MySQL / MariaDB THẬT
 * (SPEC-01 §7 · capability-matrix.md §8).
 */
export function narrowMysqlCapabilities(info: MysqlServerInfo): CapabilitySet {
  const { version, isMariaDb, lowerCaseTableNames, sqlMode } = info

  // CTE & Window functions: MySQL ≥ 8.0 / MariaDB ≥ 10.2
  const hasCte = isMariaDb ? atLeast(version, 10, 2) : atLeast(version, 8, 0)
  const hasWindow = isMariaDb ? atLeast(version, 10, 2) : atLeast(version, 8, 0)

  // RETURNING: CHỈ có ở MariaDB ≥ 10.5 (MySQL không có RETURNING)
  const hasReturning = isMariaDb && atLeast(version, 10, 5)

  // EXPLAIN ANALYZE: MySQL ≥ 8.0.18 (MariaDB không có EXPLAIN ANALYZE dạng tree chuẩn này)
  const hasExplainAnalyze = !isMariaDb && atLeast(version, 8, 0, 18)

  // Role management: MySQL ≥ 8.0 / MariaDB ≥ 10.0
  const hasRoles = isMariaDb ? atLeast(version, 10, 0) : atLeast(version, 8, 0)

  // Case sensitivity: lower_case_table_names (0 = platform, 1 = lower, 2 = insensitive)
  let caseSensitivity: 'platform' | 'insensitive' | 'lower' = 'platform'
  if (lowerCaseTableNames === 0) caseSensitivity = 'platform'
  else if (lowerCaseTableNames === 1) caseSensitivity = 'lower'
  else if (lowerCaseTableNames === 2) caseSensitivity = 'insensitive'

  // Identifier quote: ANSI_QUOTES in sql_mode => '"', default => '`'
  const hasAnsiQuotes = (sqlMode ?? '').toUpperCase().includes('ANSI_QUOTES')
  const identifierQuote = hasAnsiQuotes ? '"' : '`'

  return {
    ...MYSQL_CAPABILITIES,
    sql: {
      ...MYSQL_CAPABILITIES.sql,
      identifierQuote,
      caseSensitivity,
      cte: hasCte,
      windowFunctions: hasWindow,
      returning: hasReturning,
    },
    exec: {
      ...MYSQL_CAPABILITIES.exec,
      explainAnalyze: hasExplainAnalyze,
    },
    tools: {
      ...MYSQL_CAPABILITIES.tools,
      roleManagement: hasRoles,
    },
  }
}
