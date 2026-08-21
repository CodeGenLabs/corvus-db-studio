import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function getAllFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath))
    } else if (/\.(sql|js|redis)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

describe('seed-no-pii (SR-004, SC-014)', () => {
  const seedDir = path.resolve(process.cwd(), 'docker/dev-db/seed')
  const files = getAllFiles(seedDir)

  it('docker/dev-db/seed chứa các file seed cho 7 engine', () => {
    expect(files.length).toBeGreaterThanOrEqual(7)
  })

  it('mọi địa chỉ email trong seed data đều dùng đuôi an toàn RFC 2606 (@example.invalid, @example.com, @example.org)', () => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const allowedDomains = ['example.invalid', 'example.com', 'example.org', 'example.net']

    let totalEmailsFound = 0
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      const matches = content.match(emailRegex) || []
      for (const email of matches) {
        // Bỏ qua các biến T-SQL hoặc parameter (@p1, @name, etc.)
        if (email.startsWith('@')) continue

        const domain = email.split('@')[1]?.toLowerCase()
        if (domain && !domain.includes('$') && !domain.includes('{')) {
          totalEmailsFound++
          const isAllowed = allowedDomains.some((d) => domain === d || domain.endsWith('.' + d))
          expect(isAllowed, `Phát hiện email có domain không an toàn: ${email} trong ${file}`).toBe(true)
        }
      }
    }
    expect(totalEmailsFound).toBeGreaterThanOrEqual(1)
  })
})
