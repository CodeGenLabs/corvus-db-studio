import type { CapabilitySet } from '@corvus/contract'

export const ORACLE_CAPABILITIES: CapabilitySet = {
  hierarchy: {
    hasCatalogs: false,
    hasSchemas: true,
  },
  objects: {
    table: true,
    view: true,
    materializedView: true,
    procedure: true,
    function: true,
    package: true,
    trigger: true,
    sequence: true,
    index: true,
    domain: false,
    type: true,
    event: false,
    collection: false,
    keyspace: false,
  },
  sql: {
    parameterStyle: 'colon',
    identifierQuote: '"',
    limitSyntax: 'offset-fetch',
    maxIdentifierLength: 128,
    caseSensitivity: 'upper',
    cte: true,
    windowFunctions: true,
    returning: true,
    upsert: 'merge',
  },
  exec: {
    streamingCursor: true,
    multipleStatements: false,
    multipleResultSets: true,
    cancelStatement: true,
    explain: true,
    explainAnalyze: true,
    preparedStatements: true,
  },
  tx: {
    supported: true,
    savepoints: true,
    ddlTransactional: false, // In Oracle, DDL implicitly commits!
    isolationLevels: 3,
  },
  tools: {
    logicalBackup: true,
    physicalBackup: false,
    userManagement: true,
    roleManagement: true,
    processMonitor: true,
    serverVariables: false,
    dataGeneration: true,
    profiling: true,
  },
}

/**
 * Thu hẹp capabilities của Oracle theo phiên bản máy chủ thực tế.
 */
export function narrowOracleCapabilities(versionString?: string): CapabilitySet {
  if (!versionString) return ORACLE_CAPABILITIES

  const caps: CapabilitySet = JSON.parse(JSON.stringify(ORACLE_CAPABILITIES)) as CapabilitySet
  const match = /(\d+)\.(\d+)/.exec(versionString)
  if (!match) return caps

  const major = parseInt(match[1] ?? '0', 10)
  // Oracle < 12.1 không hỗ trợ OFFSET-FETCH, dùng ROWNUM
  if (major < 12) {
    caps.sql.limitSyntax = 'rownum'
  }

  return caps
}
