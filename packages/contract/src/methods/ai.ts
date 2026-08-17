import { z } from 'zod'
import { defineStream, defineUnary } from '../define'

export const aiChat = defineStream({
  name: 'ai.chat',
  params: z.object({
    messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() })),
    context: z.object({ schema: z.string().optional(), dialect: z.string().optional() }).optional(),
  }),
  chunk: z.object({
    seq: z.number().int().nonnegative(),
    delta: z.string(),
    done: z.boolean(),
  }),
  permission: 'ai:use',
  audit: 'metadata',
})

export const aiGenerateSql = defineUnary({
  name: 'ai.generateSql',
  params: z.object({
    prompt: z.string(),
    dialect: z.string(),
    schemaContext: z.array(z.string()).optional(),
  }),
  result: z.object({ sql: z.string(), explanation: z.string().optional() }),
  permission: 'ai:use',
  audit: 'metadata',
})

export const aiFixSql = defineUnary({
  name: 'ai.fixSql',
  params: z.object({
    sql: z.string(),
    error: z.string(),
    dialect: z.string(),
  }),
  result: z.object({ fixedSql: z.string(), explanation: z.string() }),
  permission: 'ai:use',
  audit: 'metadata',
})

export const aiExplainPlan = defineUnary({
  name: 'ai.explainPlan',
  params: z.object({
    plan: z.string(),
    dialect: z.string(),
  }),
  result: z.object({ explanation: z.string(), suggestions: z.array(z.string()) }),
  permission: 'ai:use',
  audit: 'metadata',
})

export const aiMethods = {
  'ai.chat': aiChat,
  'ai.generateSql': aiGenerateSql,
  'ai.fixSql': aiFixSql,
  'ai.explainPlan': aiExplainPlan,
} as const
