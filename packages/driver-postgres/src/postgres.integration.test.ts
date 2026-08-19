import { afterAll, beforeAll } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { POSTGRES_SETUP_SQL, runConformanceSuite } from '@corvus/driver-core'
import { splitStatements } from '@corvus/sql'
import type { ResolvedProfile } from '@corvus/driver-core'
import { postgresDriver } from './index'

/**
 * Conformance thật cho driver-postgres — chạy trên PostgreSQL 16 trong Docker.
 *
 * Không chạy trong `pnpm test` (chỉ unit). Chạy bằng:
 *   pnpm --filter @corvus/driver-postgres test:integration
 */
let container: StartedPostgreSqlContainer

// Profile được điền sau khi container khởi động; suite đọc qua tham chiếu object
// nên gán tại chỗ thay vì thay object.
const profile: ResolvedProfile = {
  id: 'conf-pg',
  name: 'conformance postgres',
  driverId: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'corvus',
  user: 'corvus',
  password: 'corvus',
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('corvus')
    .withUsername('corvus')
    .withPassword('corvus')
    .start()

  profile.host = container.getHost()
  profile.port = container.getPort()

  // Dựng schema mẫu bằng chính driver — nếu bước này lỗi thì driver đã sai từ gốc.
  // Phải tách từng statement: cursor dùng extended protocol của PostgreSQL, mà protocol
  // đó không nhận nhiều lệnh trong một lần gửi ("cannot insert multiple commands into a
  // prepared statement"). Đây cũng là bài kiểm thực tế cho splitStatements.
  const statements = splitStatements(POSTGRES_SETUP_SQL, 'postgres')
  const conn = await postgresDriver.connect(profile)
  try {
    for (const sql of statements) {
      for await (const _ of conn.execute({ sql })) {
        /* DDL không trả dòng nào */
      }
    }
  } finally {
    await conn.close()
  }
})

afterAll(async () => {
  await container?.stop()
})

runConformanceSuite(postgresDriver, { profile })
