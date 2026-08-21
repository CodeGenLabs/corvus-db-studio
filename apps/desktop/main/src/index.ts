import path from 'node:path'
import { app, BrowserWindow, ipcMain } from 'electron'
import { IpcRpcHost } from '@corvus/transport-ipc/host'
import { buildEngine } from '@corvus/host'

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd()

const engine = buildEngine()
const host = new IpcRpcHost(engine.router)
host.register(ipcMain as unknown as Parameters<typeof host.register>[0])

async function loadRenderer(win: BrowserWindow) {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://localhost:3001' : undefined)

  if (devServerUrl) {
    const maxRetries = 25
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await win.loadURL(devServerUrl)
        return
      } catch (err) {
        if (attempt === maxRetries) {
          console.warn(`[desktop-main] Could not connect to dev server at ${devServerUrl}, falling back to static dist:`, err)
          try {
            await win.loadFile(path.join(currentDir, '../../renderer/dist/index.html'))
          } catch (loadErr) {
            console.error('[desktop-main] Failed to load static renderer dist:', loadErr)
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      }
    }
  } else {
    try {
      await win.loadFile(path.join(currentDir, '../../renderer/dist/index.html'))
    } catch (loadErr) {
      console.error('[desktop-main] Failed to load static renderer dist:', loadErr)
    }
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Corvus DB Studio',
    titleBarStyle: 'hidden',
    backgroundColor: '#efeee9',
    show: false,
    webPreferences: {
      preload: path.join(currentDir, '../../preload/dist/index.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level > 1) {
      console.warn(`[Renderer L${level}] ${message} (${sourceId}:${line})`)
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  void loadRenderer(win).then(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      win.show()
    }
  })
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

app.on('before-quit', () => {
  void engine.close()
})

process.on('SIGINT', () => {
  app.quit()
  process.exit(0)
})

process.on('SIGTERM', () => {
  app.quit()
  process.exit(0)
})

// T-505 DesktopAppUpdater — export lại để module không mồ côi.
// TODO(T-505): nối vào luồng khởi động (kiểm tra cập nhật lúc mở app + mỗi 6 giờ)
// và chặn tự cài khi còn job đang chạy (SPEC-15 FR-15.29).
export { DesktopAppUpdater, type AppUpdateInfo } from './updater'
