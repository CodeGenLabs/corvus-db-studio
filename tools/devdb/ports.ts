/**
 * NGUỒN SỰ THẬT DUY NHẤT cho bảng cổng, thông tin kết nối và cấu hình môi trường 7 engine.
 * FR-003, FR-007, FR-026, FR-028.
 */

export type SupportedEngine =
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'mssql'
  | 'oracle'
  | 'mongodb'
  | 'redis'
  | 'sqlite'

export interface EngineEnvSpec {
  engine: SupportedEngine
  displayName: string
  version: string
  image?: string
  host: string
  port?: number
  database?: string
  user?: string
  password?: string
  connectionStringSample: string
  envPrefix: string
}

export const DEV_DB_ENV: Record<SupportedEngine, EngineEnvSpec> = {
  postgres: {
    engine: 'postgres',
    displayName: 'PostgreSQL',
    version: '16',
    image: 'postgres:16-alpine',
    host: '127.0.0.1',
    port: 5432,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    connectionStringSample: 'postgresql://corvus:corvus_dev_pw@127.0.0.1:5432/corvus_dev',
    envPrefix: 'DEV_DB_POSTGRES_',
  },
  mysql: {
    engine: 'mysql',
    displayName: 'MySQL',
    version: '8.0',
    image: 'mysql:8.0',
    host: '127.0.0.1',
    port: 3306,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    connectionStringSample: 'mysql://corvus:corvus_dev_pw@127.0.0.1:3306/corvus_dev',
    envPrefix: 'DEV_DB_MYSQL_',
  },
  mariadb: {
    engine: 'mariadb',
    displayName: 'MariaDB',
    version: '11.4',
    image: 'mariadb:11.4',
    host: '127.0.0.1',
    port: 3307,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    connectionStringSample: 'mariadb://corvus:corvus_dev_pw@127.0.0.1:3307/corvus_dev',
    envPrefix: 'DEV_DB_MARIADB_',
  },
  mssql: {
    engine: 'mssql',
    displayName: 'SQL Server',
    version: '2022',
    image: 'mcr.microsoft.com/mssql/server:2022-latest',
    host: '127.0.0.1',
    port: 1434, // 1433 là của người dùng — tuyệt đối không dùng 1433
    database: 'corvus_dev',
    user: 'sa',
    password: 'Corvus_dev_pw1',
    connectionStringSample: 'sqlserver://sa:Corvus_dev_pw1@127.0.0.1:1434/corvus_dev',
    envPrefix: 'DEV_DB_MSSQL_',
  },
  oracle: {
    engine: 'oracle',
    displayName: 'Oracle',
    version: '23 Free',
    image: 'gvenzl/oracle-free:23-slim',
    host: '127.0.0.1',
    port: 1521,
    database: 'FREEPDB1',
    user: 'CORVUS_DEV',
    password: 'corvus_dev_pw',
    connectionStringSample: 'oracle://CORVUS_DEV:corvus_dev_pw@127.0.0.1:1521/FREEPDB1',
    envPrefix: 'DEV_DB_ORACLE_',
  },
  mongodb: {
    engine: 'mongodb',
    displayName: 'MongoDB',
    version: '7',
    image: 'mongo:7',
    host: '127.0.0.1',
    port: 27017,
    database: 'corvus_dev',
    user: 'corvus',
    password: 'corvus_dev_pw',
    connectionStringSample: 'mongodb://corvus:corvus_dev_pw@127.0.0.1:27017/corvus_dev',
    envPrefix: 'DEV_DB_MONGODB_',
  },
  redis: {
    engine: 'redis',
    displayName: 'Redis',
    version: '7',
    image: 'redis:7-alpine',
    host: '127.0.0.1',
    port: 6379,
    database: '(prefix corvus:dev:)',
    user: undefined,
    password: 'corvus_dev_pw',
    connectionStringSample: 'redis://:corvus_dev_pw@127.0.0.1:6379',
    envPrefix: 'DEV_DB_REDIS_',
  },
  sqlite: {
    engine: 'sqlite',
    displayName: 'SQLite',
    version: '—',
    image: undefined,
    host: '(tệp)',
    port: undefined,
    database: '.corvus-data/sample.sqlite',
    user: undefined,
    password: undefined,
    connectionStringSample: '(chọn tệp trong app)',
    envPrefix: 'DEV_DB_SQLITE_',
  },
}

/** Danh sách tất cả engine cần container */
export const CONTAINER_ENGINES = Object.values(DEV_DB_ENV).filter(
  (spec): spec is EngineEnvSpec & { port: number; image: string } =>
    spec.image !== undefined && spec.port !== undefined,
)

/**
 * Đọc cấu hình engine hiệu lực từ biến môi trường (hoặc fallback giá trị mặc định).
 */
export function getEffectiveEngineConfig(engine: SupportedEngine): EngineEnvSpec {
  const spec = DEV_DB_ENV[engine]
  const prefix = spec.envPrefix

  const portStr = process.env[`${prefix}PORT`]
  const port = portStr ? parseInt(portStr, 10) : spec.port
  const host = process.env[`${prefix}HOST`] ?? spec.host
  const database = process.env[`${prefix}DATABASE`] ?? spec.database
  const user = process.env[`${prefix}USER`] ?? spec.user
  const password = process.env[`${prefix}PASSWORD`] ?? spec.password

  return {
    ...spec,
    host,
    port,
    database,
    user,
    password,
  }
}
