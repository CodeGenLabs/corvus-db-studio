import type {
  CallOptions,
  EventOf,
  TopicName,
  Transport,
  TransportStatus,
  Unsubscribe,
} from '@corvus/contract'
import type { Frame } from './frames'

/** rpc-contract.md §5.1: client ack mỗi 4 chunk; server mở lại cửa sổ 4 slot mỗi ack. */
const ACK_EVERY = 4

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

  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  /** Ai đang chờ socket mở để gửi khung `open`. */
  const openWaiters: Array<() => void> = []

  function isOpen(): boolean {
    return ws !== null && ws.readyState === WebSocket.OPEN
  }

  /**
   * Chờ WebSocket mở rồi mới gửi khung `open`.
   *
   * Trước đây `stream()` gửi khung `open` chỉ khi socket đã mở sẵn, còn không thì bỏ im —
   * generator treo vĩnh viễn, không lỗi, không timeout. Đó là lỗi khó chẩn đoán nhất:
   * người dùng thấy grid quay mãi mà console sạch.
   */
  function whenOpen(): Promise<void> {
    if (isOpen()) return Promise.resolve()
    if (status === 'closed') return Promise.reject(new Error('Transport đã đóng'))
    return new Promise<void>((resolve) => {
      openWaiters.push(resolve)
    })
  }

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

        // Khôi phục subscribe (rpc-contract §5.1). Chỉ subscribe được khôi phục —
        // stream thì KHÔNG, xem `onclose`.
        for (const topic of topicSubscriptions.keys()) {
          const frame: Frame = { t: 'sub', id: `sub-${topic}`, topic }
          ws?.send(JSON.stringify(frame))
        }

        while (openWaiters.length > 0) {
          openWaiters.shift()?.()
        }
      }

      ws.onclose = () => {
        ws = null

        // IV-4 (streaming-and-jobs §A.3): stream đang chạy bị đánh dấu 'interrupted' và
        // TUYỆT ĐỐI KHÔNG tự chạy lại. Chạy lại một `INSERT … RETURNING` sau khi mạng
        // chập chờn nghĩa là ghi dữ liệu hai lần. Chỉ người dùng mới được bấm "Thử lại".
        for (const [id, stream] of activeStreams) {
          stream.onError({
            code: 'CONNECTION_LOST',
            message: 'Mất kết nối tới server giữa lúc đang nhận kết quả',
            i18nKey: 'error.streamInterrupted',
          })
          activeStreams.delete(id)
        }

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
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      connectWs()
    }, delay)
  }

  // Điều kiện là có `WebSocket`, không phải có `window`: Node 22 có WebSocket toàn cục
  // nhưng không có `window`, nên kiểm theo `window` làm transport chết câm ở test và ở
  // mọi môi trường không phải trình duyệt.
  if (typeof WebSocket !== 'undefined') {
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
          if (unackedChunks >= ACK_EVERY) {
            unackedChunks = 0
            if (isOpen()) {
              const ack: Frame = { t: 'ack', id: streamId, seq }
              ws?.send(JSON.stringify(ack))
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
      await whenOpen()
      ws?.send(JSON.stringify(openFrame))

      const abortHandler = () => {
        if (isOpen()) {
          const cancelFrame: Frame = { t: 'cancel', id: streamId }
          ws?.send(JSON.stringify(cancelFrame))
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
