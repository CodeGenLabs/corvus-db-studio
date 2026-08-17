import type {
  CallOptions,
  EventOf,
  TopicName,
  Transport,
  TransportStatus,
  Unsubscribe,
} from '@corvus/contract'
import type { Frame } from './frames'

export interface HttpTransportOptions {
  baseUrl?: string
  wsUrl?: string
}

export function createHttpTransport(options: HttpTransportOptions = {}): Transport {
  const baseUrl = options.baseUrl ?? '/rpc'
  const wsUrl =
    options.wsUrl ??
    (typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:8080/ws')

  let ws: WebSocket | null = null
  let status: TransportStatus = 'connecting'
  const statusListeners: Array<(s: TransportStatus) => void> = []
  const topicSubscriptions = new Map<string, Set<(data: unknown) => void>>()
  const activeStreams = new Map<
    string,
    {
      onChunk: (data: unknown, seq: number) => void
      onEnd: (stats?: unknown) => void
      onError: (err: unknown) => void
    }
  >()

  let reconnectTimeout: number | null = null
  let reconnectAttempts = 0

  function setStatus(next: TransportStatus) {
    if (status === next) return
    status = next
    for (const listener of statusListeners) {
      listener(next)
    }
  }

  function connectWs() {
    if (typeof WebSocket === 'undefined') return

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        reconnectAttempts = 0
        setStatus('ready')

        // Re-subscribe to active topics
        for (const topic of topicSubscriptions.keys()) {
          const frame: Frame = { t: 'sub', id: `sub-${topic}`, topic }
          ws?.send(JSON.stringify(frame))
        }
      }

      ws.onclose = () => {
        ws = null
        if (status !== 'closed') {
          setStatus('reconnecting')
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        ws?.close()
      }

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data as string) as Frame
          if (frame.t === 'chunk') {
            const stream = activeStreams.get(frame.id)
            if (stream) stream.onChunk(frame.data, frame.seq)
          } else if (frame.t === 'end') {
            const stream = activeStreams.get(frame.id)
            if (stream) {
              stream.onEnd(frame.stats)
              activeStreams.delete(frame.id)
            }
          } else if (frame.t === 'error') {
            const stream = activeStreams.get(frame.id)
            if (stream) {
              stream.onError(frame.error)
              activeStreams.delete(frame.id)
            }
          } else if (frame.t === 'event') {
            const listeners = topicSubscriptions.get(frame.topic)
            if (listeners) {
              for (const cb of listeners) {
                cb(frame.data)
              }
            }
          } else if (frame.t === 'ping') {
            ws?.send(JSON.stringify({ t: 'pong' }))
          }
        } catch {
          // Ignore malformed frame
        }
      }
    } catch {
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout !== null) return
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000)
    reconnectAttempts++
    reconnectTimeout = window.setTimeout(() => {
      reconnectTimeout = null
      connectWs()
    }, delay)
  }

  // Initial connect if in browser
  if (typeof window !== 'undefined') {
    connectWs()
  }

  return {
    get status() {
      return status
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
      opts?: CallOptions,
    ): Promise<TResult> {
      const url = `${baseUrl}/${method}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (opts?.requestId) {
        headers['X-Request-Id'] = opts.requestId
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params ?? {}),
        signal: opts?.signal,
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }))
        throw errorBody
      }

      return (await response.json()) as TResult
    },

    async *stream<TChunk = unknown, TParams = unknown>(
      method: string,
      params: TParams,
      opts?: CallOptions,
    ): AsyncIterable<TChunk> {
      const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const queue: TChunk[] = []
      let resolveNext: (() => void) | null = null
      let isDone = false
      let streamError: unknown = null
      let unackedChunks = 0

      activeStreams.set(streamId, {
        onChunk: (data, seq) => {
          queue.push(data as TChunk)
          unackedChunks++
          if (unackedChunks >= 4) {
            unackedChunks = 0
            if (ws && ws.readyState === WebSocket.OPEN) {
              const ack: Frame = { t: 'ack', id: streamId, seq }
              ws.send(JSON.stringify(ack))
            }
          }
          if (resolveNext) {
            const r = resolveNext
            resolveNext = null
            r()
          }
        },
        onEnd: () => {
          isDone = true
          if (resolveNext) {
            const r = resolveNext
            resolveNext = null
            r()
          }
        },
        onError: (err) => {
          streamError = err
          isDone = true
          if (resolveNext) {
            const r = resolveNext
            resolveNext = null
            r()
          }
        },
      })

      const openFrame: Frame = { t: 'open', id: streamId, method, params }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(openFrame))
      }

      const abortHandler = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const cancelFrame: Frame = { t: 'cancel', id: streamId }
          ws.send(JSON.stringify(cancelFrame))
        }
        activeStreams.delete(streamId)
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
        activeStreams.delete(streamId)
      }
    },

    subscribe<T extends TopicName>(topic: T, handler: (event: EventOf<T>) => void): Unsubscribe {
      if (!topicSubscriptions.has(topic)) {
        topicSubscriptions.set(topic, new Set())
        if (ws && ws.readyState === WebSocket.OPEN) {
          const frame: Frame = { t: 'sub', id: `sub-${topic}`, topic }
          ws.send(JSON.stringify(frame))
        }
      }

      const set = topicSubscriptions.get(topic)!
      const wrapped = handler as (data: unknown) => void
      set.add(wrapped)

      return () => {
        set.delete(wrapped)
        if (set.size === 0) {
          topicSubscriptions.delete(topic)
          if (ws && ws.readyState === WebSocket.OPEN) {
            const frame: Frame = { t: 'unsub', id: `sub-${topic}` }
            ws.send(JSON.stringify(frame))
          }
        }
      }
    },
  }
}
