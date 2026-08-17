import type { Frame } from './frames'

export interface RouterLike {
  handleRequest(method: string, params: unknown, ctx?: unknown): Promise<unknown>
  handleStream?(method: string, params: unknown, ctx?: unknown): AsyncIterable<unknown>
}

export interface WsConnection {
  send(data: string): void
  on(event: 'message', cb: (data: string) => void): void
  on(event: 'close', cb: () => void): void
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
    const activeStreams = new Map<string, { cancel: () => void; unackCount: number }>()

    conn.on('message', async (raw: string) => {
      try {
        const frame = JSON.parse(raw) as Frame

        if (frame.t === 'open') {
          if (!this.router.handleStream) return

          let cancelled = false
          const streamState = {
            cancel: () => {
              cancelled = true
            },
            unackCount: 0,
          }
          activeStreams.set(frame.id, streamState)

          try {
            const stream = this.router.handleStream(frame.method, frame.params, ctx)
            let seq = 0

            for await (const chunk of stream) {
              if (cancelled) break

              // Backpressure: pause if client is lagging > 8 chunks
              while (streamState.unackCount > 8 && !cancelled) {
                await new Promise((r) => setTimeout(r, 20))
              }

              streamState.unackCount++
              conn.send(JSON.stringify({ t: 'chunk', id: frame.id, seq: seq++, data: chunk }))
            }

            if (!cancelled) {
              conn.send(JSON.stringify({ t: 'end', id: frame.id }))
            }
          } catch (err) {
            if (!cancelled) {
              conn.send(JSON.stringify({ t: 'error', id: frame.id, error: err }))
            }
          } finally {
            activeStreams.delete(frame.id)
          }
        } else if (frame.t === 'ack') {
          const s = activeStreams.get(frame.id)
          if (s) {
            s.unackCount = Math.max(0, s.unackCount - 4)
          }
        } else if (frame.t === 'cancel') {
          const s = activeStreams.get(frame.id)
          if (s) {
            s.cancel()
            activeStreams.delete(frame.id)
          }
        } else if (frame.t === 'sub') {
          if (!this.topicSubscribers.has(frame.topic)) {
            this.topicSubscribers.set(frame.topic, new Set())
          }
          this.topicSubscribers.get(frame.topic)!.add(conn)
        } else if (frame.t === 'unsub') {
          // Cleanup unsub
        } else if (frame.t === 'ping') {
          conn.send(JSON.stringify({ t: 'pong' }))
        }
      } catch {
        // Ignore malformed message
      }
    })

    conn.on('close', () => {
      for (const s of activeStreams.values()) {
        s.cancel()
      }
      activeStreams.clear()
      for (const subscribers of this.topicSubscribers.values()) {
        subscribers.delete(conn)
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
        // Drop failed connection
      }
    }
  }
}
