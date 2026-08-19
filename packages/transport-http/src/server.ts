import type { Frame } from './frames'

export interface StreamCallOptions {
  signal?: AbortSignal
}

export interface RouterLike {
  handleRequest(method: string, params: unknown, ctx?: unknown): Promise<unknown>
  handleStream?(
    method: string,
    params: unknown,
    ctx?: unknown,
    opts?: StreamCallOptions,
  ): AsyncIterable<unknown>
}

export interface WsConnection {
  send(data: string): void
  on(event: 'message', cb: (data: string) => void): void
  on(event: 'close', cb: () => void): void
  /** false khi socket đã đóng — tránh `send()` ném vào giữa vòng lặp stream. */
  readonly isOpen?: boolean
}

/** rpc-contract.md §5.1: server dừng đọc cursor khi > 8 chunk chưa được ack. */
const ACK_WINDOW = 8
/** Client gửi ack mỗi 4 chunk, nên mỗi ack giải phóng đúng 4 slot. */
const ACK_RELEASE = 4

/**
 * Hình dạng lỗi gửi qua khung `error`.
 *
 * `JSON.stringify(new Error('x'))` cho `{}` — client mất sạch thông tin. CorvusError là
 * object thường nên stringify được, nhưng vẫn phải lọc tay để KHÔNG bao giờ để `cause`
 * (có thể chứa chuỗi kết nối kèm mật khẩu) lọt ra ngoài (security.md §2, coding-rules 6.1).
 */
function toWireError(err: unknown): { code: string; message: string; i18nKey?: string; detail?: string } {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const e = err as { code: unknown; message?: unknown; i18nKey?: unknown; detail?: unknown }
    return {
      code: typeof e.code === 'string' ? e.code : 'INTERNAL_ERROR',
      message: typeof e.message === 'string' ? e.message : String(err),
      ...(typeof e.i18nKey === 'string' ? { i18nKey: e.i18nKey } : {}),
      ...(typeof e.detail === 'string' ? { detail: e.detail } : {}),
    }
  }
  return {
    code: 'INTERNAL_ERROR',
    message: err instanceof Error ? err.message : String(err),
  }
}

interface StreamState {
  readonly abort: AbortController
  unackCount: number
  /** Đánh thức vòng lặp đang chờ ack (thay cho polling `setTimeout`). */
  wake: (() => void) | null
}

export class HttpRpcServer {
  private readonly router: RouterLike
  private readonly topicSubscribers = new Map<string, Set<WsConnection>>()

  constructor(router: RouterLike) {
    this.router = router
  }

  async handleUnary(method: string, params: unknown, ctx?: unknown): Promise<unknown> {
    return this.router.handleRequest(method, params, ctx)
  }

  handleWebSocket(conn: WsConnection, ctx?: unknown) {
    const activeStreams = new Map<string, StreamState>()
    /** id khung `sub` → topic. Cần map này thì `unsub` mới xoá đúng subscriber. */
    const subscriptions = new Map<string, string>()
    let connClosed = false

    const send = (frame: Frame): void => {
      if (connClosed || conn.isOpen === false) return
      try {
        conn.send(JSON.stringify(frame))
      } catch {
        // Socket đã chết giữa chừng. Không có gì để làm ở đây — handler 'close' sẽ dọn.
      }
    }

    const runStream = async (frame: Extract<Frame, { t: 'open' }>): Promise<void> => {
      if (!this.router.handleStream) {
        send({ t: 'error', id: frame.id, error: toWireError({ code: 'UNSUPPORTED_FEATURE', message: 'Router không hỗ trợ stream' }) })
        return
      }
      if (activeStreams.has(frame.id)) {
        send({ t: 'error', id: frame.id, error: toWireError({ code: 'INVALID_INPUT', message: `Stream '${frame.id}' đã tồn tại` }) })
        return
      }

      const state: StreamState = { abort: new AbortController(), unackCount: 0, wake: null }
      activeStreams.set(frame.id, state)

      try {
        const stream = this.router.handleStream(frame.method, frame.params, ctx, {
          signal: state.abort.signal,
        })
        let seq = 0

        for await (const chunk of stream) {
          if (state.abort.signal.aborted) break

          // Backpressure (rpc-contract §5.1 / streaming-and-jobs IV-1): dừng ĐỌC cursor
          // khi client chưa tiêu thụ kịp. Chờ bằng promise được ack/cancel/close đánh
          // thức, không polling — polling vừa trễ vừa giữ event loop bận vô ích.
          while (state.unackCount >= ACK_WINDOW && !state.abort.signal.aborted) {
            await new Promise<void>((resolve) => {
              state.wake = resolve
            })
          }
          // Socket đóng hoặc client huỷ trong lúc đang chờ ack → thoát, KHÔNG treo.
          if (state.abort.signal.aborted) break

          state.unackCount++
          send({ t: 'chunk', id: frame.id, seq: seq++, data: chunk })
        }

        if (!state.abort.signal.aborted) {
          send({ t: 'end', id: frame.id })
        }
      } catch (err) {
        // Huỷ là hành vi bình thường, không phải lỗi: client đã biết mình huỷ.
        if (!state.abort.signal.aborted) {
          send({ t: 'error', id: frame.id, error: toWireError(err) })
        }
      } finally {
        activeStreams.delete(frame.id)
      }
    }

    const cancelStream = (state: StreamState): void => {
      state.abort.abort()
      // Đánh thức vòng lặp đang chờ ack, nếu không nó chờ mãi và cursor không bao giờ đóng.
      state.wake?.()
      state.wake = null
    }

    conn.on('message', (raw: string) => {
      let frame: Frame
      try {
        frame = JSON.parse(raw) as Frame
      } catch {
        return // Khung hỏng: bỏ qua, không đóng kết nối vì một tin nhắn rác.
      }

      switch (frame.t) {
        case 'open':
          // Không await: nhiều stream chạy song song trên cùng một socket.
          void runStream(frame)
          break

        case 'ack': {
          const state = activeStreams.get(frame.id)
          if (!state) break
          state.unackCount = Math.max(0, state.unackCount - ACK_RELEASE)
          if (state.unackCount < ACK_WINDOW) {
            state.wake?.()
            state.wake = null
          }
          break
        }

        case 'cancel': {
          const state = activeStreams.get(frame.id)
          if (state) cancelStream(state)
          break
        }

        case 'sub': {
          let set = this.topicSubscribers.get(frame.topic)
          if (!set) {
            set = new Set()
            this.topicSubscribers.set(frame.topic, set)
          }
          set.add(conn)
          subscriptions.set(frame.id, frame.topic)
          break
        }

        case 'unsub': {
          // Khung `unsub` chỉ mang `id`, nên phải tra ngược ra topic. Trước đây nhánh này
          // rỗng: subscriber không bao giờ bị xoá và Set phình theo mỗi lần sub/unsub.
          const topic = subscriptions.get(frame.id)
          if (topic === undefined) break
          subscriptions.delete(frame.id)
          const set = this.topicSubscribers.get(topic)
          if (!set) break
          set.delete(conn)
          if (set.size === 0) this.topicSubscribers.delete(topic)
          break
        }

        case 'ping':
          send({ t: 'pong' })
          break

        default:
          break
      }
    })

    conn.on('close', () => {
      connClosed = true
      // IV-3: socket đứt cũng là huỷ. Abort làm driver gửi CANCEL tới database và đóng
      // cursor — nếu chỉ xoá map thì query vẫn chạy tới cùng trên server.
      for (const state of activeStreams.values()) {
        cancelStream(state)
      }
      activeStreams.clear()
      subscriptions.clear()
      for (const [topic, subscribers] of this.topicSubscribers) {
        subscribers.delete(conn)
        if (subscribers.size === 0) this.topicSubscribers.delete(topic)
      }
    })
  }

  publishTopic(topic: string, data: unknown) {
    const subscribers = this.topicSubscribers.get(topic)
    if (!subscribers) return

    const payload = JSON.stringify({ t: 'event', topic, data })
    for (const conn of subscribers) {
      try {
        conn.send(payload)
      } catch {
        // Kết nối chết sẽ được dọn ở handler 'close' của chính nó.
      }
    }
  }

  /** Số subscriber của một topic — dùng trong test để chứng minh `unsub` xoá thật. */
  subscriberCount(topic: string): number {
    return this.topicSubscribers.get(topic)?.size ?? 0
  }
}
