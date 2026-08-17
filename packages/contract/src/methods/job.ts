import { z } from 'zod'
import { defineStream, defineUnary } from '../define'

export const JobKindSchema = z.enum([
  'import',
  'export',
  'backup',
  'restore',
  'transfer',
  'sync',
  'datagen',
  'batch',
])

export const JobStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'interrupted',
])

export const JobMetaSchema = z.object({
  id: z.string(),
  kind: JobKindSchema,
  name: z.string(),
  status: JobStatusSchema,
  createdAt: z.string(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  progressPercent: z.number().optional(),
  error: z.string().optional(),
})

export const jobStart = defineUnary({
  name: 'job.start',
  params: z.object({
    kind: JobKindSchema,
    name: z.string(),
    config: z.record(z.string(), z.unknown()),
  }),
  result: z.object({ jobId: z.string() }),
  permission: 'job:manage',
  audit: 'metadata',
})

export const jobList = defineUnary({
  name: 'job.list',
  params: z.object({ kind: JobKindSchema.optional(), status: JobStatusSchema.optional() }),
  result: z.array(JobMetaSchema),
  permission: 'job:read',
  audit: 'none',
})

export const jobGet = defineUnary({
  name: 'job.get',
  params: z.object({ id: z.string() }),
  result: JobMetaSchema.nullable(),
  permission: 'job:read',
  audit: 'none',
})

export const jobCancel = defineUnary({
  name: 'job.cancel',
  params: z.object({ id: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'job:manage',
  audit: 'metadata',
})

export const jobLog = defineStream({
  name: 'job.log',
  params: z.object({ id: z.string() }),
  chunk: z.object({
    seq: z.number().int().nonnegative(),
    timestamp: z.string(),
    level: z.enum(['info', 'warn', 'error']),
    message: z.string(),
    done: z.boolean(),
  }),
  permission: 'job:read',
  audit: 'none',
})

export const jobArtifacts = defineUnary({
  name: 'job.artifacts',
  params: z.object({ id: z.string() }),
  result: z.array(
    z.object({
      id: z.string(),
      fileName: z.string(),
      sizeBytes: z.number(),
      downloadUrl: z.string().optional(),
    }),
  ),
  permission: 'job:read',
  audit: 'none',
})

export const jobMethods = {
  'job.start': jobStart,
  'job.list': jobList,
  'job.get': jobGet,
  'job.cancel': jobCancel,
  'job.log': jobLog,
  'job.artifacts': jobArtifacts,
} as const
