export interface CorvusBridgeApi {
  invoke: (method: string, params: unknown) => Promise<unknown>
  openStream: (method: string, params: unknown) => MessagePort
  subscribe: (topic: string) => MessagePort
}

export function exposeCorvusBridge(
  contextBridge: { exposeInMainWorld: (name: string, api: unknown) => void },
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    postMessage: (channel: string, message: unknown, transfer?: MessagePort[]) => void
  },
) {
  const api: CorvusBridgeApi = {
    invoke: (method: string, params: unknown) => ipcRenderer.invoke('corvus:rpc', method, params),
    openStream: (method: string, params: unknown) => {
      const { port1, port2 } = new MessageChannel()
      ipcRenderer.postMessage('corvus:stream', { method, params }, [port2])
      return port1
    },
    subscribe: (topic: string) => {
      const { port1, port2 } = new MessageChannel()
      ipcRenderer.postMessage('corvus:subscribe', { topic }, [port2])
      return port1
    },
  }

  contextBridge.exposeInMainWorld('corvus', api)
}
