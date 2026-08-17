import { METHODS, type MethodName } from '@corvus/contract'

export interface RouterLike {
  handleRequest(method: string, params: unknown, ctx?: unknown): Promise<unknown>
  handleStream?(method: string, params: unknown, ctx?: unknown): AsyncIterable<unknown>
}

export interface MessagePortLike {
  postMessage(message: unknown): void
  on(event: 'message', cb: (event: { data: unknown }) => void): void
  close(): void
  start?(): void
}

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, method: string, params: unknown) => Promise<unknown>): void
  on(channel: string, listener: (event: { ports: MessagePortLike[] }, message: { method?: string; topic?: string; params?: unknown }) => void): void
}

export class IpcRpcHost {
  private readonly router: RouterLike
  private readonly topicPorts = new Map<string, Set<MessagePortLike>>()

  constructor(router: RouterLike) {
    this.router = router
  }

  register(ipcMain: IpcMainLike) {
    ipcMain.handle('corvus:rpc', async (_event, method: string, params: unknown) => {
      if (!(method in METHODS)) {
        throw new Error(`Method '${method}' is not registered in METHODS contract`)
      }
      return this.router.handleRequest(method as MethodName, params)
    })

    ipcMain.on('corvus:stream', async (event, { method, params }) => {
      const port = event.ports[0]
      if (!port) return
      if (!method || !(method in METHODS)) {
        port.postMessage({ t: 'error', error: `Invalid stream method: ${method}` })
        port.close()
        return
      }

      if (!this.router.handleStream) {
        port.postMessage({ t: 'error', error: 'Stream handler not available' })
        port.close()
        return
      }

      let cancelled = false
      port.on('message', (ev) => {
        const msg = ev.data as { t: string }
        if (msg.t === 'cancel') {
          cancelled = true
        }
      })

      if (port.start) port.start()

      try {
        const stream = this.router.handleStream(method, params)
        for await (const chunk of stream) {
          if (cancelled) break
          port.postMessage({ t: 'chunk', chunk })
        }
        if (!cancelled) {
          port.postMessage({ t: 'end' })
        }
      } catch (err) {
        if (!cancelled) {
          port.postMessage({ t: 'error', error: err })
        }
      } finally {
        port.close()
      }
    })

    ipcMain.on('corvus:subscribe', (event, { topic }) => {
      const port = event.ports[0]
      if (!port || !topic) return

      if (!this.topicPorts.has(topic)) {
        this.topicPorts.set(topic, new Set())
      }
      const set = this.topicPorts.get(topic)!
      set.add(port)

      port.on('message', (ev) => {
        const msg = ev.data as { t: string }
        if (msg.t === 'unsub') {
          set.delete(port)
          port.close()
        }
      })

      if (port.start) port.start()
    })
  }

  publishTopic(topic: string, data: unknown) {
    const subscribers = this.topicPorts.get(topic)
    if (!subscribers) return

    for (const port of subscribers) {
      try {
        port.postMessage({ data })
      } catch {
        subscribers.delete(port)
      }
    }
  }
}
