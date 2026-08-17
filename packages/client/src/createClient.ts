import type { CallOptions, EventOf, TopicName, Transport, TransportStatus, Unsubscribe } from '@corvus/contract'

export interface Client {
  request<TResult = unknown, TParams = unknown>(method: string, params?: TParams, opts?: CallOptions): Promise<TResult>
  stream<TChunk = unknown, TParams = unknown>(method: string, params?: TParams, opts?: CallOptions): AsyncIterable<TChunk>
  subscribe<T extends TopicName>(topic: T, handler: (event: EventOf<T>) => void): Unsubscribe
  readonly status: TransportStatus
  onStatusChange(cb: (s: TransportStatus) => void): Unsubscribe
  readonly transport: Transport
}

export function createClient(transport: Transport): Client {
  return {
    request: <TResult = unknown, TParams = unknown>(method: string, params?: TParams, opts?: CallOptions) =>
      transport.request<TResult, TParams>(method, params as TParams, opts),
    stream: <TChunk = unknown, TParams = unknown>(method: string, params?: TParams, opts?: CallOptions) =>
      transport.stream<TChunk, TParams>(method, params as TParams, opts),
    subscribe: <T extends TopicName>(topic: T, handler: (event: EventOf<T>) => void) =>
      transport.subscribe(topic, handler),
    get status() {
      return transport.status
    },
    onStatusChange: (cb: (s: TransportStatus) => void) => transport.onStatusChange(cb),
    transport,
  }
}
