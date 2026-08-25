import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandsDir = path.resolve(__dirname, '../../packages/ui/src/commands')
const contextMenuFile = path.resolve(__dirname, '../../packages/ui/src/components/ContextMenu.tsx')

const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g

describe('I-8 · Không có mã hex màu trong commands/ và ContextMenu.tsx (ui-rules §1.1)', () => {
  it('quét mã nguồn và khẳng định 0 mã hex màu được sử dụng', () => {
    const filesToScan: string[] = []
    if (fs.existsSync(commandsDir)) {
      filesToScan.push(
        ...fs.readdirSync(commandsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')).map((f) => path.join(commandsDir, f)),
      )
    }
    if (fs.existsSync(contextMenuFile)) {
      filesToScan.push(contextMenuFile)
    }

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const matches = content.match(HEX_COLOR_REGEX)
      expect(
        matches,
        `File ${path.basename(filePath)} vi phạm ui-rules khi chứa mã màu hex: ${matches?.join(', ')}`,
      ).toBeNull()
    }
  })
})
