import {
  corvusError,
  METHODS,
  type MethodName,
  type UnaryMethodDef,
  type StreamMethodDef,
} from '@corvus/contract'
import type { AuditLogger } from './audit'
import { InMemoryAuditLogger } from './audit'
import type { AuthContext } from './auth/types'
import { createSingleUserAuth } from './auth/types'
import { checkPermission, PreviewTokenManager } from './guards'

export type MethodHandler<TParams = unknown, TResult = unknown> = (
  params: TParams,
  ctx: AuthContext,
) => Promise<TResult>

export type StreamHandler<TParams = unknown, TChunk = unknown> = (
  params: TParams,
  ctx: AuthContext,
) => AsyncIterable<TChunk>

export interface EngineRouterOptions {
  auditLogger?: AuditLogger
  tokenManager?: PreviewTokenManager
}

export class EngineRouter {
  private readonly unaryHandlers = new Map<string, MethodHandler>()
  private readonly streamHandlers = new Map<string, StreamHandler>()
  readonly auditLogger: AuditLogger
  readonly tokenManager: PreviewTokenManager

  constructor(options: EngineRouterOptions = {}) {
    this.auditLogger = options.auditLogger ?? new InMemoryAuditLogger()
    this.tokenManager = options.tokenManager ?? new PreviewTokenManager()
  }

  registerUnary<M extends MethodName>(
    method: M,
    handler: MethodHandler,
  ): void {
    this.unaryHandlers.set(method, handler)
  }

  registerStream<M extends MethodName>(
    method: M,
    handler: StreamHandler,
  ): void {
    this.streamHandlers.set(method, handler)
  }

  async handleRequest(
    method: string,
    rawParams: unknown,
    authContext?: AuthContext,
  ): Promise<unknown> {
    const ctx = authContext ?? createSingleUserAuth()
    const start = Date.now()

    if (!(method in METHODS)) {
      throw corvusError('INVALID_INPUT', `Unknown method '${method}'`)
    }

    const def = METHODS[method as MethodName]
    if (def.kind !== 'unary') {
      throw corvusError('INVALID_INPUT', `Method '${method}' is a stream method, use handleStream`)
    }
    const unaryDef = def as UnaryMethodDef

    // 1. Validate Zod params
    const parsed = unaryDef.params.safeParse(rawParams ?? {})
    if (!parsed.success) {
      throw corvusError('INVALID_INPUT', `Validation failed for ${method}: ${parsed.error.message}`, {
        detail: JSON.stringify(parsed.error.issues),
      })
    }
    const params = parsed.data

    // 2. Guard: check permission
    const requiredPermission = unaryDef.permission ?? 'workspace:read'
    const auditLevel = unaryDef.audit ?? 'none'

    try {
      checkPermission(ctx.actor, requiredPermission)
    } catch (err) {
      await this.auditLogger.log({
        id: `audit-${Date.now()}`,
        ts: new Date().toISOString(),
        actorId: ctx.actor.id,
        actorName: ctx.actor.name,
        action: method as MethodName,
        outcome: 'denied',
        durationMs: Date.now() - start,
        level: auditLevel,
        errorMessage: (err as Error).message,
      })
      throw err
    }

    // 3. Dispatch to handler
    const handler = this.unaryHandlers.get(method)
    if (!handler) {
      throw corvusError('UNSUPPORTED_FEATURE', `Handler for method '${method}' is not implemented yet`)
    }

    try {
      const result = await handler(params, ctx)

      // Validate result
      const parsedResult = unaryDef.result.safeParse(result)
      if (!parsedResult.success) {
        throw corvusError('INTERNAL_ERROR', `Result validation failed for ${method}: ${parsedResult.error.message}`)
      }

      await this.auditLogger.log({
        id: `audit-${Date.now()}`,
        ts: new Date().toISOString(),
        actorId: ctx.actor.id,
        actorName: ctx.actor.name,
        action: method as MethodName,
        outcome: 'ok',
        durationMs: Date.now() - start,
        level: auditLevel,
      })

      return parsedResult.data
    } catch (err) {
      await this.auditLogger.log({
        id: `audit-${Date.now()}`,
        ts: new Date().toISOString(),
        actorId: ctx.actor.id,
        actorName: ctx.actor.name,
        action: method as MethodName,
        outcome: 'error',
        durationMs: Date.now() - start,
        level: auditLevel,
        errorMessage: (err as Error).message,
      })
      throw err
    }
  }

  async *handleStream(
    method: string,
    rawParams: unknown,
    authContext?: AuthContext,
  ): AsyncIterable<unknown> {
    const ctx = authContext ?? createSingleUserAuth()

    if (!(method in METHODS)) {
      throw corvusError('INVALID_INPUT', `Unknown stream method '${method}'`)
    }

    const def = METHODS[method as MethodName]
    if (def.kind !== 'stream') {
      throw corvusError('INVALID_INPUT', `Method '${method}' is a unary method, use handleRequest`)
    }
    const streamDef = def as StreamMethodDef

    // 1. Validate params
    const parsed = streamDef.params.safeParse(rawParams ?? {})
    if (!parsed.success) {
      throw corvusError('INVALID_INPUT', `Validation failed for ${method}: ${parsed.error.message}`)
    }
    const params = parsed.data

    // 2. Guard: permission
    const requiredPermission = streamDef.permission ?? 'workspace:read'
    checkPermission(ctx.actor, requiredPermission)

    // 3. Dispatch
    const handler = this.streamHandlers.get(method)
    if (!handler) {
      throw corvusError('UNSUPPORTED_FEATURE', `Stream handler for '${method}' is not implemented yet`)
    }

    const stream = handler(params, ctx)
    for await (const chunk of stream) {
      const parsedChunk = streamDef.chunk.safeParse(chunk)
      if (!parsedChunk.success) {
        throw corvusError('INTERNAL_ERROR', `Stream chunk validation failed for ${method}: ${parsedChunk.error.message}`)
      }
      yield parsedChunk.data
    }
  }
}
