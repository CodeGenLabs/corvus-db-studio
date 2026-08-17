import type { z } from 'zod'

export type AuditLevel = 'none' | 'metadata' | 'full'

export interface UnaryMethodOptions<
  Name extends string,
  Params extends z.ZodTypeAny,
  Result extends z.ZodTypeAny,
> {
  name: Name
  params: Params
  result: Result
  permission?: string
  audit?: AuditLevel
  guard?: string
}

export interface StreamMethodOptions<
  Name extends string,
  Params extends z.ZodTypeAny,
  Chunk extends z.ZodTypeAny,
> {
  name: Name
  params: Params
  chunk: Chunk
  permission?: string
  audit?: AuditLevel
  guard?: string
}

export interface UnaryMethodDef<
  Name extends string = string,
  Params extends z.ZodTypeAny = z.ZodTypeAny,
  Result extends z.ZodTypeAny = z.ZodTypeAny,
> extends UnaryMethodOptions<Name, Params, Result> {
  kind: 'unary'
}

export interface StreamMethodDef<
  Name extends string = string,
  Params extends z.ZodTypeAny = z.ZodTypeAny,
  Chunk extends z.ZodTypeAny = z.ZodTypeAny,
> extends StreamMethodOptions<Name, Params, Chunk> {
  kind: 'stream'
}

export type MethodDef = UnaryMethodDef | StreamMethodDef

export function defineUnary<
  Name extends string,
  Params extends z.ZodTypeAny,
  Result extends z.ZodTypeAny,
>(def: UnaryMethodOptions<Name, Params, Result>): UnaryMethodDef<Name, Params, Result> {
  return {
    kind: 'unary',
    ...def,
  }
}

export function defineStream<
  Name extends string,
  Params extends z.ZodTypeAny,
  Chunk extends z.ZodTypeAny,
>(def: StreamMethodOptions<Name, Params, Chunk>): StreamMethodDef<Name, Params, Chunk> {
  return {
    kind: 'stream',
    ...def,
  }
}
