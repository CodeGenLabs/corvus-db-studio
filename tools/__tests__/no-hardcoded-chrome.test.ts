import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uiComponentsDir = path.resolve(__dirname, '../../packages/ui/src/components')
const uiI18nFile = path.resolve(__dirname, '../../packages/ui/src/i18n/dictionaries.ts')

const FORBIDDEN_CHROME_STRINGS = [
  'MySQL 8.0.36',
  'utf8mb4',
  'Corvus DB Studio — sakila @ Local Dev',
  'Local Dev · sakila',
  'country @sakila',
  'Thiết kế: country',
  'Design: country',
  '設計: country',
]

describe('A-7 / SC-001 · Không còn chuỗi cứng trong Chrome và Dictionaries (HARDCODED_CHROME_DEBT = 0)', () => {
  it('quét các tệp TitleBar, StatusBar, Toolbar, InfoPane và dictionaries.ts', () => {
    const filesToScan = [
      path.join(uiComponentsDir, 'TitleBar.tsx'),
      path.join(uiComponentsDir, 'StatusBar.tsx'),
      path.join(uiComponentsDir, 'Toolbar.tsx'),
      path.join(uiComponentsDir, 'InfoPane.tsx'),
      path.join(uiComponentsDir, 'dialogs/UsersDialog.tsx'),
      uiI18nFile,
    ]

    for (const filePath of filesToScan) {
      if (!fs.existsSync(filePath)) continue
      const content = fs.readFileSync(filePath, 'utf-8')

      for (const str of FORBIDDEN_CHROME_STRINGS) {
        expect(
          content.includes(str),
          `Tệp ${path.basename(filePath)} vi phạm SC-001 khi chứa chuỗi cứng: "${str}"`,
        ).toBe(false)
      }
    }
  })
})
