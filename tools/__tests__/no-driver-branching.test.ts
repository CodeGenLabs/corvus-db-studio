import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const commandsDir = path.resolve(__dirname, '../../packages/ui/src/commands')

const FORBIDDEN_TOKENS = [
  'driverId ===',
  'driverId !==',
  'driverId ==',
  'driverId !=',
  "engine === 'postgres'",
  "engine === 'mysql'",
  "engine === 'mariadb'",
  "engine === 'sqlite'",
  "engine === 'mssql'",
  "engine === 'oracle'",
  "engine === 'mongodb'",
  "engine === 'redis'",
  "'postgres' === driverId",
  "'mysql' === driverId",
  "'mariadb' === driverId",
  "'sqlite' === driverId",
  "'mssql' === driverId",
  "'oracle' === driverId",
  "'mongodb' === driverId",
  "'redis' === driverId",
]

describe('I-7 · Không rẽ nhánh theo driverId hay engine trong packages/ui/src/commands/ (Cấm 2)', () => {
  it('quét các file mã nguồn trong commands/ và khẳng định không có rẽ nhánh theo driverId/engine', () => {
    if (!fs.existsSync(commandsDir)) return
    const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))

    for (const file of files) {
      const content = fs.readFileSync(path.join(commandsDir, file), 'utf-8')
      for (const token of FORBIDDEN_TOKENS) {
        expect(
          content.includes(token),
          `File packages/ui/src/commands/${file} vi phạm Cấm 2 khi chứa token rẽ nhánh engine: "${token}"`,
        ).toBe(false)
      }
    }
  })
})
