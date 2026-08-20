import { z } from 'zod'
import { defineStream, defineUnary } from '../define'

export const ResultChunkSchema = z.object({
  seq: z.number().int().nonnegative(),
  columns: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        align: z.enum(['r', 't', 'm']).optional(),
        nullable: z.boolean().optional(),
      }),
    )
    .optional(),
  rows: z.array(z.array(z.unknown())),
  done: z.boolean(),
  stats: z
    .object({
      rowCount: z.number().int().nonnegative(),
      durationMs: z.number().nonnegative(),
      affectedRows: z.number().int().optional(),
      // Schema này bị thiếu `truncated` dù `QueryStats` (models/query.ts) đã có từ đầu.
      // Driver phát cờ này khi chạm maxRows; thiếu nó thì UI không thể hiện banner
      // "đã cắt bớt" và người dùng kết luận sai trên dữ liệu thiếu (T-B05).
      truncated: z.boolean().optional(),
    })
    .optional(),
})

export const queryExecute = defineStream({
  name: 'query.execute',
  params: z.object({
    connectionId: z.string(),
    sql: z.string().max(4_000_000),
    params: z.array(z.unknown()).optional(),
    chunkSize: z.number().int().min(1).max(10_000).default(1_000),
    // Trần trên là BẮT BUỘC, không chỉ có mặc định: streaming-and-jobs §A.4 đặt mặc định
    // 500 000 cho query.execute, nhưng nếu schema không chặn thì client tự gửi
    // `maxRows: 100_000_000` là vô hiệu hoá giới hạn an toàn đó. 10 triệu là mốc mà IV-2
    // (RAM ≤ 400 MB) đã được đo tới.
    maxRows: z.number().int().positive().max(10_000_000).optional(),
    transactionId: z.string().optional(),
  }),
  chunk: ResultChunkSchema,
  permission: 'query:execute',
  audit: 'full',
  guard: 'writeGuard',
})

export const queryExplain = defineUnary({
  name: 'query.explain',
  params: z.object({
    connectionId: z.string(),
    sql: z.string(),
    analyze: z.boolean().default(false),
  }),
  result: z.object({
    format: z.enum(['tree', 'json', 'text']),
    plan: z.unknown(),
    raw: z.string(),
  }),
  permission: 'query:explain',
  audit: 'metadata',
})

export const queryFormat = defineUnary({
  name: 'query.format',
  params: z.object({
    sql: z.string(),
    dialect: z.string().optional(),
    uppercase: z.boolean().default(true),
  }),
  result: z.object({ sql: z.string() }),
  permission: 'query:format',
  audit: 'none',
})

export const queryParse = defineUnary({
  name: 'query.parse',
  params: z.object({
    sql: z.string(),
    dialect: z.string().optional(),
  }),
  result: z.object({
    statements: z.array(
      z.object({
        sql: z.string(),
        type: z.string(),
        startLine: z.number(),
        endLine: z.number(),
      }),
    ),
  }),
  permission: 'query:parse',
  audit: 'none',
})

export const queryCancel = defineUnary({
  name: 'query.cancel',
  params: z.object({ queryId: z.string() }),
  result: z.object({ success: z.boolean() }),
  permission: 'query:cancel',
  audit: 'none',
})

export const queryHistoryList = defineUnary({
  name: 'query.history.list',
  params: z.object({ limit: z.number().int().default(50) }),
  result: z.array(
    z.object({
      id: z.string(),
      sql: z.string(),
      executedAt: z.string(),
      durationMs: z.number(),
      connectionName: z.string(),
      status: z.enum(['success', 'error']),
    }),
  ),
  permission: 'query:history',
  audit: 'none',
})

export const queryHistoryClear = defineUnary({
  name: 'query.history.clear',
  params: z.object({}),
  result: z.object({ success: z.boolean() }),
  permission: 'query:history',
  audit: 'metadata',
})

export const queryMethods = {
  'query.execute': queryExecute,
  'query.explain': queryExplain,
  'query.format': queryFormat,
  'query.parse': queryParse,
  'query.cancel': queryCancel,
  'query.history.list': queryHistoryList,
  'query.history.clear': queryHistoryClear,
} as const
