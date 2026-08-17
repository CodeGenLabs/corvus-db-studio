export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveFileOptions {
  defaultPath?: string
  filters?: FileFilter[]
  content?: string | Uint8Array
}

export interface SaveFileResult {
  filePath?: string
  canceled: boolean
}

export interface OpenFileOptions {
  filters?: FileFilter[]
  multiple?: boolean
}

export interface OpenFileResult {
  filePaths: string[]
  canceled: boolean
}

export interface FileGateway {
  saveFile(options: SaveFileOptions): Promise<SaveFileResult>
  openFile(options: OpenFileOptions): Promise<OpenFileResult>
  readFile(filePath: string): Promise<Uint8Array>
  writeFile(filePath: string, data: Uint8Array | string): Promise<void>
}
