import { z } from 'zod'
import { defineUnary } from '../define'

export const ScheduleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  cronExpression: z.string(),
  jobKind: z.string(),
  jobConfig: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
})

export const scheduleList = defineUnary({
  name: 'schedule.list',
  params: z.object({}),
  result: z.array(ScheduleItemSchema),
  permission: 'schedule:read',
  audit: 'none',
})

export const scheduleCreate = defineUnary({
  name: 'schedule.create',
  params: ScheduleItemSchema.omit({ id: true }),
  result: ScheduleItemSchema,
  permission: 'schedule:manage',
  audit: 'metadata',
})

export const scheduleUpdate = defineUnary({
  name: 'schedule.update',
  params: ScheduleItemSchema,
  result: ScheduleItemSchema,
  permission: 'schedule:manage',
  audit: 'metadata',
})

export const scheduleDelete = defineUnary({
  name: 'schedule.delete',
  params: z.object({ id: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'schedule:manage',
  audit: 'metadata',
})

export const scheduleRunNow = defineUnary({
  name: 'schedule.runNow',
  params: z.object({ id: z.string() }),
  result: z.object({ jobId: z.string() }),
  permission: 'schedule:manage',
  audit: 'metadata',
})

export const scheduleHistory = defineUnary({
  name: 'schedule.history',
  params: z.object({ scheduleId: z.string(), limit: z.number().int().default(50) }),
  result: z.array(
    z.object({
      id: z.string(),
      executedAt: z.string(),
      status: z.string(),
      durationMs: z.number(),
    }),
  ),
  permission: 'schedule:read',
  audit: 'none',
})

export const scheduleMethods = {
  'schedule.list': scheduleList,
  'schedule.create': scheduleCreate,
  'schedule.update': scheduleUpdate,
  'schedule.delete': scheduleDelete,
  'schedule.runNow': scheduleRunNow,
  'schedule.history': scheduleHistory,
} as const
