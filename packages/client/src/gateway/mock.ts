import type {
  FileGateway,
  OpenFileOptions,
  OpenFileResult,
  SaveFileOptions,
  SaveFileResult,
} from '@corvus/contract'

export class MockFileGateway implements FileGateway {
  private readonly files = new Map<string, Uint8Array>()

  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const path = options.defaultPath || '/mock/file.txt'
    if (options.content) {
      const data =
        typeof options.content === 'string'
          ? new TextEncoder().encode(options.content)
          : options.content
      this.files.set(path, data)
    }
    return { filePath: path, canceled: false }
  }

  async openFile(options: OpenFileOptions): Promise<OpenFileResult> {
    const defaultPath = '/mock/file.txt'
    return {
      filePaths: options.multiple ? [defaultPath] : [defaultPath],
      canceled: false,
    }
  }

  async readFile(filePath: string): Promise<Uint8Array> {
    return this.files.get(filePath) || new Uint8Array()
  }

  async writeFile(filePath: string, data: Uint8Array | string): Promise<void> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    this.files.set(filePath, bytes)
  }
}
