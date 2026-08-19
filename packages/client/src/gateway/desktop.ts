import type {
  FileGateway,
  OpenFileOptions,
  OpenFileResult,
  SaveFileOptions,
  SaveFileResult,
} from '@corvus/contract'

/**
 * Bề mặt duy nhất mà preload của Electron phơi ra renderer cho việc chọn file.
 * Toàn bộ optional vì renderer có thể chạy trong browser (khi dev UI) — lúc đó
 * gateway rơi về hành vi mặc định thay vì crash.
 */
export interface DesktopFileBridge {
  saveFile?(options: SaveFileOptions): Promise<SaveFileResult>
  openFile?(options: OpenFileOptions): Promise<OpenFileResult>
  readFile?(filePath: string): Promise<Uint8Array>
  writeFile?(filePath: string, data: Uint8Array | string): Promise<void>
}

declare global {
  interface Window {
    corvusDesktop?: { fileGateway?: DesktopFileBridge }
  }
}

export class DesktopFileGateway implements FileGateway {
  private readonly ipcBridge: DesktopFileBridge | null

  constructor(ipcBridge?: DesktopFileBridge) {
    this.ipcBridge =
      ipcBridge ?? (typeof window !== 'undefined' ? window.corvusDesktop?.fileGateway ?? null : null)
  }

  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    if (this.ipcBridge?.saveFile) {
      return this.ipcBridge.saveFile(options)
    }
    return { filePath: options.defaultPath, canceled: false }
  }

  async openFile(options: OpenFileOptions): Promise<OpenFileResult> {
    if (this.ipcBridge?.openFile) {
      return this.ipcBridge.openFile(options)
    }
    return { filePaths: [], canceled: true }
  }

  async readFile(filePath: string): Promise<Uint8Array> {
    if (this.ipcBridge?.readFile) {
      return this.ipcBridge.readFile(filePath)
    }
    return new Uint8Array()
  }

  async writeFile(filePath: string, data: Uint8Array | string): Promise<void> {
    if (this.ipcBridge?.writeFile) {
      await this.ipcBridge.writeFile(filePath, data)
    }
  }
}
