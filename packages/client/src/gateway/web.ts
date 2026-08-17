import type {
  FileGateway,
  OpenFileOptions,
  OpenFileResult,
  SaveFileOptions,
  SaveFileResult,
} from '@corvus/contract'

export class WebFileGateway implements FileGateway {
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    if (options.content) {
      const blob =
        typeof options.content === 'string'
          ? new Blob([options.content], { type: 'text/plain;charset=utf-8' })
          : new Blob([options.content as any], { type: 'application/octet-stream' })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = options.defaultPath || 'download.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { filePath: a.download, canceled: false }
    }

    return { canceled: false }
  }

  async openFile(options: OpenFileOptions): Promise<OpenFileResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = !!options.multiple

      if (options.filters && options.filters.length > 0) {
        input.accept = options.filters
          .flatMap((f) => f.extensions.map((ext) => `.${ext}`))
          .join(',')
      }

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          resolve({ filePaths: [], canceled: true })
          return
        }

        const names = Array.from(input.files).map((f) => f.name)
        resolve({ filePaths: names, canceled: false })
      }

      input.oncancel = () => {
        resolve({ filePaths: [], canceled: true })
      }

      input.click()
    })
  }

  async readFile(_filePath: string): Promise<Uint8Array> {
    return new Uint8Array()
  }

  async writeFile(_filePath: string, _data: Uint8Array | string): Promise<void> {}
}
