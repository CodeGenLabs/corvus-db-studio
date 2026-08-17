import type { z } from 'zod'

export type TransportStatus = 'connecting' | 'ready' | 'reconnecting' | 'closed'

export type Unsubscribe = () => void

export interface CallOptions {
  signal?: AbortSignal
  timeoutMs?: number
  /** Idempotency key — cho phép retry an toàn sau khi mạng đứt. */
  requestId?: string
}

export type UnaryMethod = string
export type StreamMethod = string
export type TopicName = 'job.progress' | 'connection.state' | 'schema.invalidated' | 'notification'

export interface TopicEvents {
  'job.progress': { jobId: string; percent: number; phase: string; message: string }
  'connection.state': { connectionId: string; status: 'connected' | 'disconnected' | 'reconnecting'; error?: string }
  'schema.invalidated': { connectionId: string; database?: string; schema?: string }
  'notification': { id: string; level: 'info' | 'warn' | 'error'; message: string; timestamp: string }
}

export type EventOf<T extends TopicName> = T extends keyof TopicEvents ? TopicEvents[T] : unknown

export type InferParams<M> = M extends { params: infer P extends z.ZodTypeAny } ? z.infer<P> : unknown
export type InferResult<M> = M extends { result: infer R extends z.ZodTypeAny } ? z.infer<R> : unknown
export type InferChunk<M> = M extends { chunk: infer C extends z.ZodTypeAny } ? z.infer<C> : unknown

export interface Transport {
  /** Gọi-đáp một lần. Dùng cho ~95% method. */
  request<TResult = unknown, TParams = unknown>(
    method: string,
    params: TParams,
    opts?: CallOptions,
  ): Promise<TResult>

  /** Dòng chunk có thứ tự, huỷ được. Dùng cho result set và log job. */
  stream<TChunk = unknown, TParams = unknown>(
    method: string,
    params: TParams,
    opts?: CallOptions,
  ): AsyncIterable<TChunk>

  /** Sự kiện do server đẩy, không do client hỏi. */
  subscribe<T extends TopicName>(
    topic: T,
    handler: (event: EventOf<T>) => void,
  ): Unsubscribe

  /** Trạng thái đường truyền, để UI hiện banner "mất kết nối". */
  readonly status: TransportStatus
  onStatusChange(cb: (s: TransportStatus) => void): Unsubscribe
}
