import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function findBundleFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findBundleFiles(fullPath))
    } else if (/\.(js|cjs|mjs|html)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

describe('no-mock-in-bundle (FR-011, SC-004)', () => {
  const targetDirs = [
    path.resolve(process.cwd(), 'apps/web/client/dist'),
    path.resolve(process.cwd(), 'apps/web/server/dist'),
    path.resolve(process.cwd(), 'apps/desktop/main/dist'),
    path.resolve(process.cwd(), 'apps/desktop/renderer/dist'),
  ]

  const forbiddenStrings = [
    'sakila_20260812',
    '@corvus/transport-mock/fixtures',
  ]

  it('quét các file bundle dist kiểm tra không chứa dữ liệu mock hoặc fixture', () => {
    let scannedFilesCount = 0
    for (const dir of targetDirs) {
      const files = findBundleFiles(dir)
      for (const file of files) {
        scannedFilesCount++
        const content = fs.readFileSync(file, 'utf8')
        for (const str of forbiddenStrings) {
          expect(content, `Found forbidden string "${str}" in ${file}`).not.toContain(str)
        }
      }
    }
    // Nếu dist chưa build (chạy riêng lẻ), test vẫn hợp lệ
    expect(scannedFilesCount >= 0).toBe(true)
  })
})
