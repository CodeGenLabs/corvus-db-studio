import type { CapabilitySet } from '@corvus/contract'

export const MSSQL_CAPABILITIES: CapabilitySet = {
  hierarchy: {
    hasCatalogs: true,
    hasSchemas: true,
  },
  objects: {
    table: true,
    view: true,
    materializedView: false,
    procedure: true,
    function: true,
    package: false,
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
    parameterStyle: 'at',
    identifierQuote: '"',
    limitSyntax: 'offset-fetch',
    maxIdentifierLength: 128,
    caseSensitivity: 'insensitive',
    cte: true,
    windowFunctions: true,
    returning: true,
    upsert: 'merge',
  },
  exec: {
    streamingCursor: true,
    multipleStatements: true,
    multipleResultSets: true,
    cancelStatement: true,
    explain: true,
    explainAnalyze: true,
    preparedStatements: true,
  },
  tx: {
    supported: true,
    savepoints: true,
    ddlTransactional: true,
    isolationLevels: 4,
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
 * Thu hẹp capabilities của SQL Server theo phiên bản máy chủ thực tế (T064).
 */
export function narrowMssqlCapabilities(versionString?: string): CapabilitySet {
  if (!versionString) return MSSQL_CAPABILITIES

  const caps: CapabilitySet = JSON.parse(JSON.stringify(MSSQL_CAPABILITIES)) as CapabilitySet
  const match = /(\d+)\.(\d+)/.exec(versionString)
  if (!match) return caps

  const major = parseInt(match[1] ?? '0', 10)
  // SQL Server < 2012 (version < 11.0) không hỗ trợ SEQUENCE hoặc OFFSET-FETCH
  if (major < 11) {
    caps.objects.sequence = false
    caps.sql.limitSyntax = 'limit-offset'
  }

  return caps
}
