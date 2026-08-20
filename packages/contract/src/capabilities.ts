export interface HierarchyCapabilities {
  hasCatalogs: boolean
  hasSchemas: boolean
}

export const OBJECT_KINDS = [
  'table',
  'view',
  'materializedView',
  'procedure',
  'function',
  'package',
  'trigger',
  'sequence',
  'index',
  'domain',
  'type',
  'event',
  'collection',
  'keyspace',
] as const

export type ObjectKind = (typeof OBJECT_KINDS)[number]

export type ObjectCapabilities = Record<ObjectKind, boolean>

export interface SqlCapabilities {
  supported?: boolean
  parameterStyle: 'dollar' | 'question' | 'at' | 'colon'
  identifierQuote: '"' | '`' | '[]'
  limitSyntax: 'limit-offset' | 'offset-fetch' | 'rownum'
  maxIdentifierLength: number
  caseSensitivity: 'lower' | 'upper' | 'insensitive' | 'platform'
  cte: boolean
  windowFunctions: boolean
  returning: boolean | 'output'
  upsert: 'on-conflict' | 'on-duplicate-key' | 'merge' | 'none'
}

export interface ExecutionCapabilities {
  streamingCursor: boolean
  multipleStatements: boolean
  multipleResultSets: boolean
  cancelStatement: boolean
  explain: boolean
  explainAnalyze: boolean
  preparedStatements: boolean
}

export interface TransactionCapabilities {
  supported: boolean
  savepoints: boolean
  ddlTransactional: boolean
  isolationLevels: number
}

export interface ToolCapabilities {
  logicalBackup: boolean
  physicalBackup: boolean
  userManagement: boolean
  roleManagement: boolean
  processMonitor: boolean
  serverVariables: boolean
  dataGeneration: boolean
  profiling: boolean
}

export interface CapabilitySet {
  hierarchy: HierarchyCapabilities
  objects: ObjectCapabilities
  sql: SqlCapabilities
  exec: ExecutionCapabilities
  tx: TransactionCapabilities
  tools: ToolCapabilities
}
