import { z } from 'zod'
import { defineUnary } from '../define'

export const txBegin = defineUnary({
  name: 'tx.begin',
  params: z.object({
    connectionId: z.string(),
    isolationLevel: z.enum(['read_uncommitted', 'read_committed', 'repeatable_read', 'serializable']).optional(),
  }),
  result: z.object({ transactionId: z.string() }),
  permission: 'tx:manage',
  audit: 'metadata',
})

export const txCommit = defineUnary({
  name: 'tx.commit',
  params: z.object({ transactionId: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'tx:manage',
  audit: 'metadata',
})

export const txRollback = defineUnary({
  name: 'tx.rollback',
  params: z.object({ transactionId: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'tx:manage',
  audit: 'metadata',
})

export const txStatus = defineUnary({
  name: 'tx.status',
  params: z.object({ transactionId: z.string() }),
  result: z.object({
    active: z.boolean(),
    startedAt: z.string(),
    queryCount: z.number().int(),
  }),
  permission: 'tx:manage',
  audit: 'none',
})

export const txMethods = {
  'tx.begin': txBegin,
  'tx.commit': txCommit,
  'tx.rollback': txRollback,
  'tx.status': txStatus,
} as const
