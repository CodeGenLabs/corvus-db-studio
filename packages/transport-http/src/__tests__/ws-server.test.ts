import { describe, expect, it, vi } from 'vitest'
import { HttpRpcServer, type RouterLike, type StreamCallOptions, type WsConnection } from '../server'
import type { Frame } from '../frames'

/**
 * T-B05 — kiểm tra tầng framing WebSocket của server, KHÔNG cần mạng và KHÔNG cần database.
 *
 * Những bất biến ở đây (backpressure, huỷ, dọn tài nguyên, unsub) là thứ quyết định app
 * có sập khi gặp bảng 50 triệu dòng hay không, nên phải kiểm được ở tầng rẻ nhất.
 */

/** Socket giả: ghi lại mọi khung đã gửi, cho phép test bơm khung vào. */
class FakeSocket implements WsConnection {
  readonly sent: Frame[] = []
  isOpen = true
  private messageCb: ((data: string) => void) | undefined
  private closeCb: (() => void) | undefined

  send(data: string): void {
    if (!this.isOpen) throw new Error('socket đã đóng')
    this.sent.push(JSON.parse(data) as Frame)
  }

  on(event: 'message' | 'close', cb: (data: string) => void): void {
    if (event === 'message') this.messageCb = cb
    else this.closeCb = cb as () => void
  }

  emit(frame: Frame): void {
    this.messageCb?.(JSON.stringify(frame))
  }

  close(): void {
    this.isOpen = false
    this.closeCb?.()
  }

  chunks(): Frame[] {
    return this.sent.filter((f) => f.t === 'chunk')
  }
}

/** Chờ tới khi điều kiện đúng — KHÔNG dùng sleep cố định (coding-rules 10.4). */
async function until(cond: () => boolean, label: string, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!cond()) {
    if (Date.now() > deadline) throw new Error(`Quá hạn chờ: ${label}`)
    await new Promise((r) => setTimeout(r, 1))
  }
}

/** Router giả phát vô hạn chunk, ghi lại việc bị huỷ. */
function infiniteRouter(): RouterLike & { produced: number; aborted: boolean; closed: boolean } {
  const state = { produced: 0, aborted: false, closed: false }
  return {
    produced: 0,
    aborted: false,
    closed: false,
    async handleRequest() {
      return {}
    },
    handleStream(_method: string, _params: unknown, _ctx: unknown, opts?: StreamCallOptions) {
      const self = this as { produced: number; aborted: boolean; closed: boolean }
      return (async function* () {
        try {
          for (let i = 0; ; i++) {
            if (opts?.signal?.aborted) {
              self.aborted = true
              return
            }
            self.produced = ++state.produced
            yield { seq: i, rows: [[i]], done: false }
            // Nhường event loop để khung ack của test có cơ hội tới.
            await new Promise((r) => setTimeout(r, 0))
          }
        } finally {
          // Đây là chỗ driver thật đóng cursor + trả connection về pool.
          self.closed = true
        }
      })()
    },
  }
}

describe('HttpRpcServer.handleWebSocket · framing', () => {
  it('phát chunk với seq liên tục từ 0 rồi kết thúc bằng khung end', async () => {
    const router: RouterLike = {
      async handleRequest() {
        return {}
      },
      async *handleStream() {
        yield { seq: 0, rows: [[1]], done: false }
        yield { seq: 1, rows: [[2]], done: false }
        yield { seq: 2, rows: [[3]], done: true }
      },
    }
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.sent.some((f) => f.t === 'end'), 'khung end')

    const chunks = socket.chunks()
    expect(chunks.map((f) => (f as { seq: number }).seq)).toEqual([0, 1, 2])
    expect(socket.sent.at(-1)).toEqual({ t: 'end', id: 's1' })
  })

  it('trả lời ping bằng pong', async () => {
    const socket = new FakeSocket()
    new HttpRpcServer({ async handleRequest() { return {} } }).handleWebSocket(socket)
    socket.emit({ t: 'ping' })
    await until(() => socket.sent.some((f) => f.t === 'pong'), 'pong')
  })

  it('bỏ qua khung hỏng thay vì làm sập kết nối', async () => {
    const socket = new FakeSocket()
    new HttpRpcServer({ async handleRequest() { return {} } }).handleWebSocket(socket)
    expect(() => socket.emit('{{{ không phải JSON' as unknown as Frame)).not.toThrow()
    socket.emit({ t: 'ping' })
    await until(() => socket.sent.some((f) => f.t === 'pong'), 'pong sau khung hỏng')
  })
})

describe('HttpRpcServer.handleWebSocket · backpressure', () => {
  it('dừng đọc khi client ngừng ack, KHÔNG phồng bộ nhớ vô hạn', async () => {
    const router = infiniteRouter()
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })

    // Không gửi ack nào. Server phải dừng ở đúng cửa sổ 8 chunk.
    await until(() => socket.chunks().length >= 8, '8 chunk đầu')
    const stalledAt = socket.chunks().length

    // Cho event loop chạy thoải mái: nếu backpressure hỏng, số chunk sẽ tăng vọt.
    for (let i = 0; i < 50; i++) await new Promise((r) => setTimeout(r, 0))

    expect(socket.chunks().length).toBe(stalledAt)
    expect(stalledAt).toBe(8)
  })

  it('mỗi ack mở lại đúng 4 slot', async () => {
    const router = infiniteRouter()
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.chunks().length === 8, 'đầy cửa sổ')

    socket.emit({ t: 'ack', id: 's1', seq: 7 })
    await until(() => socket.chunks().length === 12, '4 chunk nữa sau 1 ack')

    // Rồi lại dừng: cửa sổ đầy trở lại.
    for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0))
    expect(socket.chunks().length).toBe(12)
  })

  it('client chết giữa lúc server đang chờ ack → stream kết thúc, KHÔNG treo', async () => {
    const router = infiniteRouter()
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.chunks().length === 8, 'đầy cửa sổ')

    socket.close()

    // Generator phải chạy tới `finally` — đó là chỗ cursor được đóng và connection trả
    // về pool. Nếu vòng chờ ack không được đánh thức, dòng này sẽ quá hạn.
    await until(() => router.closed, 'generator dọn tài nguyên sau khi socket đóng')
    expect(router.aborted || router.closed).toBe(true)
  })
})

describe('HttpRpcServer.handleWebSocket · huỷ và dọn dẹp', () => {
  it('khung cancel abort signal và dừng phát chunk', async () => {
    const router = infiniteRouter()
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.chunks().length > 0, 'chunk đầu tiên')

    socket.emit({ t: 'cancel', id: 's1' })
    await until(() => router.closed, 'generator đóng sau cancel')

    const after = socket.chunks().length
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0))
    expect(socket.chunks().length).toBe(after)
    // Huỷ là hành vi bình thường: không được gửi khung error.
    expect(socket.sent.some((f) => f.t === 'error')).toBe(false)
  })

  it('lỗi trong stream đi ra dưới dạng CorvusError có mã, không phải Error thô', async () => {
    const router: RouterLike = {
      async handleRequest() {
        return {}
      },
      // eslint-disable-next-line require-yield -- stream này cố tình lỗi ngay lập tức
      async *handleStream() {
        throw Object.assign(new Error('relation "khong_ton_tai" does not exist'), {
          code: 'OBJECT_NOT_FOUND',
          i18nKey: 'error.objectNotFound',
        })
      },
    }
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.sent.some((f) => f.t === 'error'), 'khung error')

    const frame = socket.sent.find((f) => f.t === 'error') as { error: Record<string, unknown> }
    expect(frame.error.code).toBe('OBJECT_NOT_FOUND')
    expect(frame.error.i18nKey).toBe('error.objectNotFound')
    expect(typeof frame.error.message).toBe('string')
  })

  it('Error thô không có code vẫn thành INTERNAL_ERROR chứ không phải {}', async () => {
    const router: RouterLike = {
      async handleRequest() {
        return {}
      },
      // eslint-disable-next-line require-yield -- stream này cố tình lỗi ngay lập tức
      async *handleStream() {
        throw new Error('vỡ ở đâu đó')
      },
    }
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.sent.some((f) => f.t === 'error'), 'khung error')

    const frame = socket.sent.find((f) => f.t === 'error') as { error: Record<string, unknown> }
    expect(frame.error.code).toBe('INTERNAL_ERROR')
    expect(frame.error.message).toBe('vỡ ở đâu đó')
  })

  it('khung error KHÔNG mang theo `cause` (nơi mật khẩu hay lọt ra)', async () => {
    const router: RouterLike = {
      async handleRequest() {
        return {}
      },
      // eslint-disable-next-line require-yield -- stream này cố tình lỗi ngay lập tức
      async *handleStream() {
        throw Object.assign(new Error('kết nối thất bại'), {
          code: 'CONNECTION_FAILED',
          cause: new Error('postgres://corvus:sieu-mat-khau@db:5432/prod'),
        })
      },
    }
    const socket = new FakeSocket()
    new HttpRpcServer(router).handleWebSocket(socket)

    socket.emit({ t: 'open', id: 's1', method: 'query.execute', params: {} })
    await until(() => socket.sent.some((f) => f.t === 'error'), 'khung error')

    expect(JSON.stringify(socket.sent)).not.toContain('sieu-mat-khau')
  })
})

describe('HttpRpcServer · subscribe / unsubscribe', () => {
  const noopRouter: RouterLike = {
    async handleRequest() {
      return {}
    },
  }

  it('unsub xoá subscriber thật — publishTopic không gửi nữa', () => {
    const server = new HttpRpcServer(noopRouter)
    const socket = new FakeSocket()
    server.handleWebSocket(socket)

    socket.emit({ t: 'sub', id: 'sub-job.progress', topic: 'job.progress' })
    expect(server.subscriberCount('job.progress')).toBe(1)

    server.publishTopic('job.progress', { pct: 10 })
    expect(socket.sent.filter((f) => f.t === 'event')).toHaveLength(1)

    socket.emit({ t: 'unsub', id: 'sub-job.progress' })
    expect(server.subscriberCount('job.progress')).toBe(0)

    server.publishTopic('job.progress', { pct: 20 })
    expect(socket.sent.filter((f) => f.t === 'event')).toHaveLength(1)
  })

  it('sub/unsub lặp nhiều lần không làm phình bộ nhớ', () => {
    const server = new HttpRpcServer(noopRouter)
    const socket = new FakeSocket()
    server.handleWebSocket(socket)

    for (let i = 0; i < 1_000; i++) {
      socket.emit({ t: 'sub', id: `sub-${i}`, topic: 'job.progress' })
      socket.emit({ t: 'unsub', id: `sub-${i}` })
    }
    expect(server.subscriberCount('job.progress')).toBe(0)
  })

  it('đóng socket xoá subscriber của chính nó, giữ nguyên của socket khác', () => {
    const server = new HttpRpcServer(noopRouter)
    const a = new FakeSocket()
    const b = new FakeSocket()
    server.handleWebSocket(a)
    server.handleWebSocket(b)

    a.emit({ t: 'sub', id: 'sub-1', topic: 'job.progress' })
    b.emit({ t: 'sub', id: 'sub-1', topic: 'job.progress' })
    expect(server.subscriberCount('job.progress')).toBe(2)

    a.close()
    expect(server.subscriberCount('job.progress')).toBe(1)

    const before = b.sent.length
    server.publishTopic('job.progress', { pct: 50 })
    expect(b.sent.length).toBe(before + 1)
  })

  it('không gửi tiếp cho socket đã đóng dù publishTopic được gọi', () => {
    const server = new HttpRpcServer(noopRouter)
    const socket = new FakeSocket()
    server.handleWebSocket(socket)
    socket.emit({ t: 'sub', id: 'sub-1', topic: 'job.progress' })

    const spy = vi.spyOn(socket, 'send')
    socket.close()
    server.publishTopic('job.progress', { pct: 99 })
    expect(spy).not.toHaveBeenCalled()
  })
})
