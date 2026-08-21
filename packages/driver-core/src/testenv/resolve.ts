/**
 * Phân giải cấu hình kết nối cho test integration và chốt an toàn 3 lớp (SR-005, R-4).
 * T011, T050..T057, T062.
 */
import net from 'node:net'
import { splitStatements, type SqlDialect } from '@corvus/sql'
import type { DatabaseDriver, ResolvedProfile } from '../types'
import type { EngineFamily } from './dialect'

export interface DevEngineConfig {
  engine: EngineFamily
  host: string
  port?: number
  database?: string
  user?: string
  password?: string
  envPrefix: string
}

export const DEFAULT_DEV_CONFIGS: Record<EngineFamily, DevEngineConfig> = {
  postgres: {
    engine: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    envPrefix: 'DEV_DB_POSTGRES_',
  },
  mysql: {
    engine: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    envPrefix: 'DEV_DB_MYSQL_',
  },
  mariadb: {
    engine: 'mariadb',
    host: '127.0.0.1',
    port: 3307,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    envPrefix: 'DEV_DB_MARIADB_',
  },
  mssql: {
    engine: 'mssql',
    host: '127.0.0.1',
    port: 1434, // 1433 là của SQL Server ngoài máy — cấm tuyệt đối
    database: 'corvus_dev',
    user: 'sa',
    password: 'Corvus_dev_pw1',
    envPrefix: 'DEV_DB_MSSQL_',
  },
  oracle: {
    engine: 'oracle',
    host: '127.0.0.1',
    port: 1521,
    database: 'FREEPDB1',
    user: 'CORVUS_DEV',
    password: 'corvus_dev_pw',
    envPrefix: 'DEV_DB_ORACLE_',
  },
  mongodb: {
    engine: 'mongodb',
    host: '127.0.0.1',
    port: 27017,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    envPrefix: 'DEV_DB_MONGODB_',
  },
  redis: {
    engine: 'redis',
    host: '127.0.0.1',
    port: 6379,
    password: 'corvus_dev_pw',
    envPrefix: 'DEV_DB_REDIS_',
  },
  sqlite: {
    engine: 'sqlite',
    host: '127.0.0.1',
    database: '.corvus-data/sample.sqlite',
    envPrefix: 'DEV_DB_SQLITE_',
  },
}

export function isLoopbackHost(host?: string): boolean {
  if (!host) return true
  const trimmed = host.trim().toLowerCase()
  return (
    trimmed === '127.0.0.1' ||
    trimmed === 'localhost' ||
    trimmed === '::1' ||
    trimmed === '0.0.0.0' ||
    trimmed.startsWith('127.') ||
    trimmed === '(tệp)'
  )
}

/**
 * Đọc cấu hình hiệu lực cho một engine từ biến môi trường hoặc mặc định
 */
export function getEffectiveEngineConfig(engine: EngineFamily): DevEngineConfig {
  const base = DEFAULT_DEV_CONFIGS[engine]
  const prefix = base.envPrefix

  const portStr = process.env[`${prefix}PORT`]
  const port = portStr ? parseInt(portStr, 10) : base.port
  const host = process.env[`${prefix}HOST`] ?? base.host
  const database = process.env[`${prefix}DATABASE`] ?? base.database
  const user = process.env[`${prefix}USER`] ?? base.user
  const password = process.env[`${prefix}PASSWORD`] ?? base.password

  return {
    ...base,
    host,
    port,
    database,
    user,
    password,
  }
}

/**
 * Sinh ResolvedProfile cho test trỏ vào Docker dev database
 */
export function getDockerTestProfile(
  engine: EngineFamily,
  overrides?: Partial<ResolvedProfile>,
): ResolvedProfile {
  const cfg = getEffectiveEngineConfig(engine)

  return {
    id: `test-docker-${engine}`,
    name: `Test Docker ${engine}`,
    driverId: engine,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ...overrides,
  }
}

/**
 * Chốt an toàn 3 lớp (SR-005) trước khi thực thi bất kỳ thao tác ghi/tạo/xoá nào
 */
export async function assertSafetyLatch(
  profile: ResolvedProfile,
  markerCheckFn?: () => Promise<boolean>,
): Promise<void> {
  // Lớp 1: Host phải thuộc loopback
  if (!isLoopbackHost(profile.host)) {
    throw new Error(
      `[CHỐT AN TOÀN SR-005] Host "${profile.host}" không phải loopback (127.0.0.1/localhost). Từ chối chạy test ghi trên database ngoại lai!`,
    )
  }

  // Lớp 2: Kiểm tra cổng an toàn
  if (profile.driverId === 'mssql' && profile.port === 1433) {
    throw new Error(
      `[CHỐT AN TOÀN SR-005] Cổng 1433 là cổng dịch vụ SQL Server riêng của máy host. Tuyệt đối không kết nối cổng này!`,
    )
  }

  // Lớp 3: Kiểm tra marker bảng/dữ liệu mẫu dev
  if (markerCheckFn) {
    const isDevDb = await markerCheckFn()
    if (!isDevDb) {
      throw new Error(
        `[CHỐT AN TOÀN SR-005] Không tìm thấy dấu hiệu corvus_env_marker trong database đích (${profile.driverId}). Từ chối thực thi test ghi!`,
      )
    }
  }
}

/**
 * Kiểm tra nhanh xem cổng dịch vụ của engine trong Docker có đang mở không
 */
export async function isDockerServiceAvailable(
  engine: EngineFamily,
  timeoutMs = 500,
): Promise<boolean> {
  const cfg = getEffectiveEngineConfig(engine)
  const port = cfg.port
  if (!port) {
    return true // sqlite không cần cổng mạng
  }

  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket()
    let resolved = false

    const finish = (result: boolean) => {
      if (!resolved) {
        resolved = true
        socket.destroy()
        resolve(result)
      }
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))

    try {
      socket.connect(port, cfg.host)
    } catch {
      finish(false)
    }
  })
}

export interface TestEnvironmentHandle {
  profile: ResolvedProfile
  isStaticStack: boolean
  teardown: () => Promise<void>
}

/**
 * Helper thiết lập môi trường test tích hợp (T050..T057, R-4, R-5):
 * - Nếu Docker dev-db đang chạy: dùng ngay stack cố định (nhanh gấp nhiều lần).
 * - Nếu Docker dev-db chưa chạy: fallback sang testcontainers (nếu được cung cấp).
 */
export async function setupTestEnvironment(
  engine: EngineFamily,
  driver?: DatabaseDriver,
  setupSql?: string | readonly string[],
  fallbackContainerFactory?: () => Promise<{
    profile: ResolvedProfile
    stop: () => Promise<void>
  }>,
): Promise<TestEnvironmentHandle> {
  const isAvailable = await isDockerServiceAvailable(engine)

  if (isAvailable) {
    const profile = getDockerTestProfile(engine)
    await assertSafetyLatch(profile)

    if (driver && setupSql) {
      const sqlDialect: SqlDialect =
        engine === 'mariadb'
          ? 'mysql'
          : engine === 'postgres' ||
              engine === 'mysql' ||
              engine === 'mssql' ||
              engine === 'oracle' ||
              engine === 'sqlite'
            ? engine
            : 'postgres'

      const statements = Array.isArray(setupSql)
        ? setupSql
        : splitStatements(setupSql as string, sqlDialect)

      const conn = await driver.connect(profile)
      try {
        for (const sql of statements) {
          try {
            for await (const _ of conn.execute({ sql })) {
              /* DDL */
            }
          } catch (err: unknown) {
            const msg = String(err).toLowerCase()
            if (
              !msg.includes('already exists') &&
              !msg.includes('duplicate') &&
              !msg.includes('ora-00955') &&
              !msg.includes('table_exists') &&
              !msg.includes('unknown column')
            ) {
              throw err
            }
          }
        }
      } finally {
        await conn.close()
      }
    }

    return {
      profile,
      isStaticStack: true,
      teardown: async () => {
        /* Không tắt container stack cố định */
      },
    }
  }

  if (fallbackContainerFactory) {
    const container = await fallbackContainerFactory()
    const profile = container.profile

    if (driver && setupSql) {
      const sqlDialect: SqlDialect =
        engine === 'mariadb'
          ? 'mysql'
          : engine === 'postgres' ||
              engine === 'mysql' ||
              engine === 'mssql' ||
              engine === 'oracle' ||
              engine === 'sqlite'
            ? engine
            : 'postgres'

      const statements = Array.isArray(setupSql)
        ? setupSql
        : splitStatements(setupSql as string, sqlDialect)

      const conn = await driver.connect(profile)
      try {
        for (const sql of statements) {
          for await (const _ of conn.execute({ sql })) {
            /* DDL */
          }
        }
      } finally {
        await conn.close()
      }
    }

    return {
      profile,
      isStaticStack: false,
      teardown: container.stop,
    }
  }

  throw new Error(
    `[testenv] Môi trường Docker dev-db cho engine "${engine}" chưa sẵn sàng (chạy \`pnpm db:up --only ${engine}\` để bắt đầu), và không có fallback testcontainers.`,
  )
}
