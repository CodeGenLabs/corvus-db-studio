import { aiMethods } from './ai'
import { connectionMethods } from './connection'
import { dataMethods } from './data'
import { ddlMethods } from './ddl'
import { fileMethods } from './file'
import { introspectMethods } from './introspect'
import { jobMethods } from './job'
import { monitorMethods } from './monitor'
import { queryMethods } from './query'
import { scheduleMethods } from './schedule'
import { securityMethods } from './security'
import { txMethods } from './tx'
import { workspaceMethods } from './workspace'

export * from './connection'
export * from './introspect'
export * from './query'
export * from './data'
export * from './ddl'
export * from './tx'
export * from './job'
export * from './schedule'
export * from './security'
export * from './monitor'
export * from './workspace'
export * from './file'
export * from './ai'

export const METHODS = {
  ...connectionMethods,
  ...introspectMethods,
  ...queryMethods,
  ...dataMethods,
  ...ddlMethods,
  ...txMethods,
  ...jobMethods,
  ...scheduleMethods,
  ...securityMethods,
  ...monitorMethods,
  ...workspaceMethods,
  ...fileMethods,
  ...aiMethods,
} as const

export type MethodName = keyof typeof METHODS
