import * as fs from 'node:fs'
import * as path from 'node:path'
import { METHODS } from '../packages/contract/src/index'

export function generateApiDocs(outputDir = 'docs/api'): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  let markdown = '# Corvus DB Studio RPC API Reference\n\n'
  markdown += 'Tài liệu tự động sinh từ `@corvus/contract/src/define.ts` và registry `METHODS`.\n\n'
  markdown += '| Tên Phương thức | Loại | Yêu cầu Auth | Ghi chú Audit |\n'
  markdown += '|---|---|---|---|\n'

  for (const [name, def] of Object.entries(METHODS)) {
    const isStream = def.type === 'stream' ? 'Stream' : 'Unary'
    markdown += `| \`${name}\` | ${isStream} | Bắt buộc | ${def.type} call |\n`
  }

  const filePath = path.join(outputDir, 'rpc-methods.md')
  fs.writeFileSync(filePath, markdown, 'utf-8')
  console.log(`[Gen API Docs] Written documentation to ${filePath}`)
}

if (process.argv[1] && process.argv[1].endsWith('gen-api-docs.ts')) {
  generateApiDocs()
}
