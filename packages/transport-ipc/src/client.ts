import type {
  CallOptions,
  EventOf,
  TopicName,
  Transport,
  TransportStatus,
  Unsubscribe,
} from '@corvus/contract'
import type { CorvusBridgeApi } from './preload'

export function createIpcTransport(api?: CorvusBridgeApi): Transport {
  const bridge =
    api ??
    (typeof window !== 'undefined'
      ? (window as unknown as { corvus?: CorvusBridgeApi }).corvus
      : undefined)

  if (!bridge) {
    throw new Error('Corvus bridge API is not available in window.corvus')
  }

  const currentStatus: TransportStatus = 'ready'
  const statusListeners: Array<(s: TransportStatus) => void> = []

  return {
    get status() {
      return currentStatus
    },

    onStatusChange(cb: (s: TransportStatus) => void): Unsubscribe {
      statusListeners.push(cb)
      return () => {
        const idx = statusListeners.indexOf(cb)
        if (idx !== -1) statusListeners.splice(idx, 1)
      }
    },

    async request<TResult = unknown, TParams = unknown>(
      method: string,
      params: TParams,
      _opts?: CallOptions,
    ): Promise<TResult> {
      return bridge.invoke(method, params) as Promise<TResult>
    },

    async *stream<TChunk = unknown, TParams = unknown>(
      method: string,
      params: TParams,
      opts?: CallOptions,
    ): AsyncIterable<TChunk> {
      const port = bridge.openStream(method, params)
      const queue: TChunk[] = []
      let resolveNext: (() => void) | null = null
      let isDone = false
      let streamError: unknown = null

      port.onmessage = (event) => {
        const msg = event.data as { t: string; chunk?: unknown; error?: unknown }
        if (msg.t === 'chunk') {
          queue.push(msg.chunk as TChunk)
          if (resolveNext) {
            const r = resolveNext
            resolveNext = null
            r()
          }
        } else if (msg.t === 'end') {
          isDone = true
          if (resolveNext) {
            const r = resolveNext
            resolveNext = null
            r()
          }
        } else if (msg.t === 'error') {
          streamError = msg.error
          isDone = true
          if (resolveNext) {
            const r = resolveNext
            resolveNext = null
            r()
          }
        }
      }

      port.start()

      const abortHandler = () => {
        port.postMessage({ t: 'cancel' })
        port.close()
        isDone = true
        if (resolveNext) {
          const r = resolveNext
          resolveNext = null
          r()
        }
      }

      opts?.signal?.addEventListener('abort', abortHandler)

      try {
        while (!isDone || queue.length > 0) {
          if (queue.length === 0 && !isDone) {
            await new Promise<void>((resolve) => {
              resolveNext = resolve
            })
          }

          while (queue.length > 0) {
            yield queue.shift()!
          }

          if (streamError) {
            throw streamError
          }
        }
      } finally {
        opts?.signal?.removeEventListener('abort', abortHandler)
        port.close()
      }
    },

    subscribe<T extends TopicName>(topic: T, handler: (event: EventOf<T>) => void): Unsubscribe {
      const port = bridge.subscribe(topic)

      port.onmessage = (event) => {
        const msg = event.data as { data: unknown }
        handler(msg.data as EventOf<T>)
      }

      port.start()

      return () => {
        port.postMessage({ t: 'unsub' })
        port.close()
      }
    },
  }
}
