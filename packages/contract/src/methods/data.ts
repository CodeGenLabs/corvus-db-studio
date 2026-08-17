import { z } from 'zod'
import { defineStream, defineUnary } from '../define'
import { ResultChunkSchema } from './query'

export const dataBrowse = defineStream({
  name: 'data.browse',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    table: z.string(),
    filter: z.array(z.object({ join: z.string(), field: z.string(), op: z.string(), value: z.string() })).optional(),
    sort: z.array(z.object({ field: z.string(), dir: z.enum(['ASC', 'DESC']) })).optional(),
    limit: z.number().int().default(100),
    offset: z.number().int().default(0),
  }),
  chunk: ResultChunkSchema,
  permission: 'data:read',
  audit: 'none',
})

export const dataCount = defineUnary({
  name: 'data.count',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    table: z.string(),
    estimate: z.boolean().default(true),
  }),
  result: z.object({ count: z.number().int().nonnegative(), isEstimate: z.boolean() }),
  permission: 'data:read',
  audit: 'none',
})

export const dataPreviewChanges = defineUnary({
  name: 'data.previewChanges',
  params: z.object({
    connectionId: z.string(),
    database: z.string().optional(),
    schema: z.string().optional(),
    table: z.string(),
    inserts: z.array(z.record(z.string(), z.unknown())).default([]),
    updates: z.array(z.object({ keys: z.record(z.string(), z.unknown()), values: z.record(z.string(), z.unknown()) })).default([]),
    deletes: z.array(z.record(z.string(), z.unknown())).default([]),
  }),
  result: z.object({
    sql: z.string(),
    previewToken: z.string(),
    warnings: z.array(z.string()).default([]),
  }),
  permission: 'data:write',
  audit: 'metadata',
})

export const dataApplyChanges = defineUnary({
  name: 'data.applyChanges',
  params: z.object({
    previewToken: z.string(),
  }),
  result: z.object({
    affectedRows: z.number().int().nonnegative(),
    success: z.boolean(),
  }),
  permission: 'data:write',
  audit: 'full',
  guard: 'writeGuard',
})

export const dataFkLookup = defineUnary({
  name: 'data.fkLookup',
  params: z.object({
    connectionId: z.string(),
    referencedTable: z.string(),
    referencedColumn: z.string(),
    search: z.string().optional(),
    limit: z.number().int().default(20),
  }),
  result: z.array(z.object({ key: z.string(), label: z.string() })),
  permission: 'data:read',
  audit: 'none',
})

export const dataMethods = {
  'data.browse': dataBrowse,
  'data.count': dataCount,
  'data.previewChanges': dataPreviewChanges,
  'data.applyChanges': dataApplyChanges,
  'data.fkLookup': dataFkLookup,
} as const
