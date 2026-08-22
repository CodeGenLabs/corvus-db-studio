import { describe, it, expect, vi } from 'vitest'
import { exposeCorvusBridge } from '../preload'

describe('exposeCorvusBridge windowControls', () => {
  it('exposes windowControls on corvus bridge', async () => {
    let exposedApi: any
    const mockContextBridge = {
      exposeInMainWorld: (_name: string, api: any) => {
        exposedApi = api
      },
    }
    const mockIpcRenderer = {
      invoke: vi.fn().mockImplementation((channel) => {
        if (channel === 'corvus:window:isMaximized') return Promise.resolve(true)
        return Promise.resolve(undefined)
      }),
      postMessage: vi.fn(),
    }

    exposeCorvusBridge(mockContextBridge as any, mockIpcRenderer as any)
    expect(exposedApi).toBeDefined()
    expect(exposedApi.windowControls).toBeDefined()
    expect(typeof exposedApi.windowControls.minimize).toBe('function')
    expect(typeof exposedApi.windowControls.maximize).toBe('function')
    expect(typeof exposedApi.windowControls.close).toBe('function')
    expect(typeof exposedApi.windowControls.isMaximized).toBe('function')

    exposedApi.windowControls.minimize()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('corvus:window:minimize')

    exposedApi.windowControls.maximize()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('corvus:window:maximize')

    exposedApi.windowControls.close()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('corvus:window:close')

    const isMax = await exposedApi.windowControls.isMaximized()
    expect(isMax).toBe(true)
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('corvus:window:isMaximized')
  })
})