import { z } from 'zod'
import { defineStream, defineUnary } from '../define'

export const monitorProcesses = defineStream({
  name: 'monitor.processes',
  params: z.object({
    connectionId: z.string(),
    intervalMs: z.number().int().min(500).default(2000),
  }),
  chunk: z.object({
    seq: z.number().int().nonnegative(),
    processes: z.array(
      z.object({
        id: z.string(),
        user: z.string(),
        host: z.string(),
        db: z.string().optional(),
        command: z.string(),
        timeSec: z.number(),
        state: z.string(),
        info: z.string().optional(),
      }),
    ),
    done: z.boolean(),
  }),
  permission: 'monitor:read',
  audit: 'none',
})

export const monitorKillProcess = defineUnary({
  name: 'monitor.killProcess',
  params: z.object({
    connectionId: z.string(),
    processId: z.string(),
  }),
  result: z.object({ success: z.boolean() }),
  permission: 'monitor:manage',
  audit: 'metadata',
})

export const monitorVariables = defineUnary({
  name: 'monitor.variables',
  params: z.object({ connectionId: z.string() }),
  result: z.array(z.object({ name: z.string(), value: z.string() })),
  permission: 'monitor:read',
  audit: 'none',
})

export const monitorStatus = defineUnary({
  name: 'monitor.status',
  params: z.object({ connectionId: z.string() }),
  result: z.record(z.string(), z.string()),
  permission: 'monitor:read',
  audit: 'none',
})

export const monitorMethods = {
  'monitor.processes': monitorProcesses,
  'monitor.killProcess': monitorKillProcess,
  'monitor.variables': monitorVariables,
  'monitor.status': monitorStatus,
} as const
