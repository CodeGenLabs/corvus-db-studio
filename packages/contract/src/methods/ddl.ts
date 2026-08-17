import { z } from 'zod'
import { defineUnary } from '../define'

export const ddlPreviewTable = defineUnary({
  name: 'ddl.previewTable',
  params: z.object({
    connectionId: z.string(),
    tableDesign: z.record(z.string(), z.unknown()),
  }),
  result: z.object({
    sql: z.string(),
    previewToken: z.string(),
    warnings: z.array(z.string()).default([]),
  }),
  permission: 'ddl:write',
  audit: 'metadata',
})

export const ddlApplyTable = defineUnary({
  name: 'ddl.applyTable',
  params: z.object({
    previewToken: z.string(),
  }),
  result: z.object({ success: z.boolean() }),
  permission: 'ddl:write',
  audit: 'full',
  guard: 'writeGuard',
})

export const ddlPreviewView = defineUnary({
  name: 'ddl.previewView',
  params: z.object({
    connectionId: z.string(),
    viewDesign: z.record(z.string(), z.unknown()),
  }),
  result: z.object({
    sql: z.string(),
    previewToken: z.string(),
    warnings: z.array(z.string()).default([]),
  }),
  permission: 'ddl:write',
  audit: 'metadata',
})

export const ddlApplyView = defineUnary({
  name: 'ddl.applyView',
  params: z.object({
    previewToken: z.string(),
  }),
  result: z.object({ success: z.boolean() }),
  permission: 'ddl:write',
  audit: 'full',
  guard: 'writeGuard',
})

export const ddlPreviewRoutine = defineUnary({
  name: 'ddl.previewRoutine',
  params: z.object({
    connectionId: z.string(),
    routineDesign: z.record(z.string(), z.unknown()),
  }),
  result: z.object({
    sql: z.string(),
    previewToken: z.string(),
    warnings: z.array(z.string()).default([]),
  }),
  permission: 'ddl:write',
  audit: 'metadata',
})

export const ddlApplyRoutine = defineUnary({
  name: 'ddl.applyRoutine',
  params: z.object({
    previewToken: z.string(),
  }),
  result: z.object({ success: z.boolean() }),
  permission: 'ddl:write',
  audit: 'full',
  guard: 'writeGuard',
})

export const ddlDropObject = defineUnary({
  name: 'ddl.dropObject',
  params: z.object({
    connectionId: z.string(),
    kind: z.string(),
    name: z.string(),
    cascade: z.boolean().default(false),
  }),
  result: z.object({
    sql: z.string(),
    previewToken: z.string(),
    warnings: z.array(z.string()).default([]),
  }),
  permission: 'ddl:write',
  audit: 'metadata',
})

export const ddlMaintain = defineUnary({
  name: 'ddl.maintain',
  params: z.object({
    connectionId: z.string(),
    table: z.string(),
    action: z.enum(['analyze', 'optimize', 'vacuum', 'reindex', 'repair']),
  }),
  result: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  permission: 'ddl:write',
  audit: 'metadata',
  guard: 'writeGuard',
})

export const ddlMethods = {
  'ddl.previewTable': ddlPreviewTable,
  'ddl.applyTable': ddlApplyTable,
  'ddl.previewView': ddlPreviewView,
  'ddl.applyView': ddlApplyView,
  'ddl.previewRoutine': ddlPreviewRoutine,
  'ddl.applyRoutine': ddlApplyRoutine,
  'ddl.dropObject': ddlDropObject,
  'ddl.maintain': ddlMaintain,
} as const
