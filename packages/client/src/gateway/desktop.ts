import type {
  FileGateway,
  OpenFileOptions,
  OpenFileResult,
  SaveFileOptions,
  SaveFileResult,
} from '@corvus/contract'

export class DesktopFileGateway implements FileGateway {
  private readonly ipcBridge: any

  constructor(ipcBridge?: any) {
    this.ipcBridge =
      ipcBridge ||
      (typeof window !== 'undefined' ? (window as any).corvusDesktop?.fileGateway : null)
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
