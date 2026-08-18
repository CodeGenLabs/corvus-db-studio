import * as fs from 'node:fs'
import { extractBackupMetadata } from '@corvus/sql'

export interface BackupListingItem {
  filePath: string
  fileName: string
  fileSize: number
  database?: string
  dialect?: string
  createdAt?: string
  version?: string
}

export class BackupListManager {
  /**
   * Reads only the first 16KB of each backup file in a directory to extract metadata without reading entire multi-GB files
   */
  public static async listBackups(directoryPath: string): Promise<BackupListingItem[]> {
    if (!fs.existsSync(directoryPath)) return []

    const files = await fs.promises.readdir(directoryPath)
    const results: BackupListingItem[] = []

    for (const file of files) {
      if (!file.endsWith('.sql') && !file.endsWith('.corvus-backup')) continue

      const fullPath = `${directoryPath}/${file}`
      try {
        const stat = await fs.promises.stat(fullPath)
        const fd = await fs.promises.open(fullPath, 'r')
        const buf = Buffer.alloc(16 * 1024) // 16KB header buffer
        const { bytesRead } = await fd.read(buf, 0, buf.length, 0)
        await fd.close()

        const headerStr = buf.subarray(0, bytesRead).toString('utf-8')
        const meta = extractBackupMetadata(headerStr)

        results.push({
          filePath: fullPath,
          fileName: file,
          fileSize: stat.size,
          database: meta?.database,
          dialect: meta?.dialect,
          createdAt: meta?.createdAt,
          version: meta?.version,
        })
      } catch {
        // Ignore unreadable files
      }
    }

    return results
  }
}
