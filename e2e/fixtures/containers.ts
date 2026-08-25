import net from 'node:net'

export interface ContainerEndpoint {
  engine: string
  host: string
  port: number
}

export const DEV_CONTAINER_PORTS: Record<string, number> = {
  postgres: 5432,
  mysql: 3306,
  mariadb: 3307,
  mssql: 1434,
  oracle: 1521,
  mongodb: 27017,
  redis: 6379,
}

export async function checkPort(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)

    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.connect(port, host)
  })
}

export async function requireDevContainers(engines: string[] = ['postgres', 'mysql']): Promise<void> {
  const missing: string[] = []
  for (const eng of engines) {
    const port = DEV_CONTAINER_PORTS[eng]
    if (port) {
      const open = await checkPort('127.0.0.1', port)
      if (!open) {
        missing.push(`${eng} (cổng ${port})`)
      }
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[E2E Notice] Containers chưa sẵn sàng: ${missing.join(', ')}. Chạy 'pnpm devdb:up' để khởi động Docker containers.`,
    )
  }
}
