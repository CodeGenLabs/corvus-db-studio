import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const req = createRequire(import.meta.url)

function getDatabaseConstructor() {
  try {
    return req('better-sqlite3')
  } catch {
    try {
      return req(
        path.resolve(
          __dirname,
          '../../../packages/driver-sqlite/node_modules/better-sqlite3',
        ),
      )
    } catch {
      return req(
        path.resolve(
          __dirname,
          '../../../packages/storage/node_modules/better-sqlite3',
        ),
      )
    }
  }
}

export function buildSampleSqlite(
  targetPath = path.resolve(__dirname, '../../../../.corvus-data/sample.sqlite'),
): string {
  const destination = targetPath

  const dir = path.dirname(destination)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const sqlFile = path.join(__dirname, 'build-sample.sql')
  const sql = fs.readFileSync(sqlFile, 'utf-8')

  const Database = getDatabaseConstructor()
  const db = new Database(destination)
  try {
    db.exec(sql)
  } finally {
    db.close()
  }

  return destination
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = buildSampleSqlite()
  console.warn(`[sqlite-sample] Đã tạo tệp SQLite mẫu tại: ${result}`)
}
