import { z } from 'zod'
import { defineUnary } from '../define'

export const filePickOpen = defineUnary({
  name: 'file.pickOpen',
  params: z.object({
    filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional(),
    multiple: z.boolean().default(false),
  }),
  result: z.object({ paths: z.array(z.string()) }),
  permission: 'file:access',
  audit: 'none',
})

export const filePickSave = defineUnary({
  name: 'file.pickSave',
  params: z.object({
    defaultPath: z.string().optional(),
    filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional(),
  }),
  result: z.object({ path: z.string().nullable() }),
  permission: 'file:access',
  audit: 'none',
})

export const fileReadChunk = defineUnary({
  name: 'file.readChunk',
  params: z.object({
    path: z.string(),
    offset: z.number().int().nonnegative(),
    length: z.number().int().positive(),
  }),
  result: z.object({
    data: z.string(), // base64
    bytesRead: z.number().int().nonnegative(),
    eof: z.boolean(),
  }),
  permission: 'file:access',
  audit: 'none',
})

export const fileWriteChunk = defineUnary({
  name: 'file.writeChunk',
  params: z.object({
    path: z.string(),
    offset: z.number().int().nonnegative(),
    data: z.string(), // base64
  }),
  result: z.object({ bytesWritten: z.number().int().nonnegative() }),
  permission: 'file:access',
  audit: 'none',
})

export const fileStat = defineUnary({
  name: 'file.stat',
  params: z.object({ path: z.string() }),
  result: z.object({
    sizeBytes: z.number().int().nonnegative(),
    modifiedAt: z.string(),
    isFile: z.boolean(),
    isDirectory: z.boolean(),
  }),
  permission: 'file:access',
  audit: 'none',
})

export const fileMethods = {
  'file.pickOpen': filePickOpen,
  'file.pickSave': filePickSave,
  'file.readChunk': fileReadChunk,
  'file.writeChunk': fileWriteChunk,
  'file.stat': fileStat,
} as const
