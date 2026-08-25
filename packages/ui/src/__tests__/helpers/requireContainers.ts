export type EngineFamily = 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'oracle' | 'sqlite' | 'mongodb' | 'redis'

const DEFAULT_DEV_PORTS: Record<EngineFamily, number | null> = {
  postgres: 5432,
  mysql: 3306,
  mariadb: 3307,
  mssql: 1434,
  oracle: 1521,
  mongodb: 27017,
  redis: 6379,
  sqlite: null,
}

export async function isContainerAvailable(engine: EngineFamily, timeoutMs = 1000): Promise<boolean> {
  const port = DEFAULT_DEV_PORTS[engine]
  if (port === null) return true

  const rpcPort = Number(process.env.CORVUS_PORT || 8080)
  const host = process.env.CORVUS_HOST || '127.0.0.1'

  try {
    const res = await fetch(`http://${host}:${rpcPort}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'connection.test',
        params: {
          profile: {
            driverId: engine,
            host: '127.0.0.1',
            port,
            database: engine === 'oracle' ? 'FREEPDB1' : 'corvus_dev',
            user: engine === 'mssql' ? 'sa' : engine === 'oracle' ? 'CORVUS_DEV' : 'corvus',
            password: engine === 'mssql' ? 'Corvus_dev_pw1' : 'corvus_dev_pw',
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export async function requireContainer(engine: EngineFamily): Promise<void> {
  const available = await isContainerAvailable(engine)
  if (!available) {
    throw new Error(
      `[TIỀN KIỂM DOCKER THẤT BẠI] Container cho engine "${engine}" chưa sẵn sàng.\n` +
        `Vui lòng chạy: \`pnpm db:up --only ${engine}\` hoặc \`pnpm db:up\` trước khi chạy test này.`,
    )
  }
}

export async function requireContainers(engines: EngineFamily[]): Promise<void> {
  const missing: EngineFamily[] = []
  for (const engine of engines) {
    const available = await isContainerAvailable(engine)
    if (!available) {
      missing.push(engine)
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[TIỀN KIỂM DOCKER THẤT BẠI] Các container sau chưa chạy: ${missing.join(', ')}.\n` +
        `Vui lòng chạy: \`pnpm db:up\` để khởi động stack container database phát triển.`,
    )
  }
}
