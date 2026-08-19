import { errorMessage } from '@corvus/contract'
export interface ImportRowError {
  rowIndex: number
  rowData: unknown
  errorMessage: string
}

export interface ImportPipelineOptions {
  batchSize?: number
  stopOnError?: boolean
  onByteProgress?: (processedBytes: number, totalBytes: number) => void
  onRowProgress?: (processedRows: number) => void
  onRowError?: (err: ImportRowError) => void
}

export interface ImportPipelineResult {
  totalRows: number
  importedRows: number
  failedRows: number
  errors: ImportRowError[]
}

export class ImportPipelineRunner {
  public static async executePipeline(
    rows: unknown[],
    totalBytes: number,
    insertFn: (batch: unknown[]) => Promise<void>,
    options: ImportPipelineOptions = {},
  ): Promise<ImportPipelineResult> {
    const batchSize = options.batchSize || 1000
    const errors: ImportRowError[] = []
    let importedRows = 0

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      try {
        await insertFn(batch)
        importedRows += batch.length
      } catch {
        // Lô thất bại: thử lại từng dòng để khoanh vùng dòng lỗi.
        // Lỗi của cả lô bị bỏ qua có chủ ý — lỗi từng dòng mới có giá trị cho người dùng.
        for (let j = 0; j < batch.length; j++) {
          const singleRow = [batch[j]]
          const rowIndex = i + j + 1
          try {
            await insertFn(singleRow)
            importedRows++
          } catch (rowErr: unknown) {
            const errorObj: ImportRowError = {
              rowIndex,
              rowData: batch[j],
              errorMessage: errorMessage(rowErr),
            }
            errors.push(errorObj)
            options.onRowError?.(errorObj)

            if (options.stopOnError) {
              return {
                totalRows: rows.length,
                importedRows,
                failedRows: errors.length,
                errors,
              }
            }
          }
        }
      }

      options.onRowProgress?.(Math.min(i + batchSize, rows.length))
      const processedApproxBytes = Math.round(((i + batch.length) / rows.length) * totalBytes)
      options.onByteProgress?.(processedApproxBytes, totalBytes)
    }

    return {
      totalRows: rows.length,
      importedRows,
      failedRows: errors.length,
      errors,
    }
  }
}
