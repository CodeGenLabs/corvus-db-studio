import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain } from 'electron'
import { IpcRpcHost } from '@corvus/transport-ipc/host'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dummy mock router until @corvus/engine is linked in T-018
const mockRouter = {
  async handleRequest(method: string, params: unknown) {
    return { ok: true, method, params }
  },
  async *handleStream(method: string, params: unknown) {
    yield { seq: 0, method, params, done: true }
  },
}

const host = new IpcRpcHost(mockRouter)
host.register(ipcMain as unknown as Parameters<typeof host.register>[0])

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Corvus DB Studio',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/dist/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
