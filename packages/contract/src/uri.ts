import type { ConnectionProfile, DriverId } from './models'

const SCHEME_TO_DRIVER: Record<string, DriverId> = {
  postgres: 'postgres',
  postgresql: 'postgres',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlite: 'sqlite',
  mssql: 'mssql',
  sqlserver: 'mssql',
  oracle: 'oracle',
  mongodb: 'mongodb',
  redis: 'redis',
}

const DRIVER_TO_SCHEME: Record<DriverId, string> = {
  postgres: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mariadb',
  sqlite: 'sqlite',
  mssql: 'sqlserver',
  oracle: 'oracle',
  mongodb: 'mongodb',
  redis: 'redis',
}

export function parseConnectionUri(uri: string): Partial<ConnectionProfile> {
  try {
    const url = new URL(uri)
    const scheme = url.protocol.replace(':', '')
    const driverId = SCHEME_TO_DRIVER[scheme] || 'postgres'

    if (driverId === 'sqlite') {
      const filePath = url.pathname || ''
      return {
        driverId: 'sqlite',
        name: filePath.split('/').pop() || 'SQLite DB',
        host: filePath,
      }
    }

    const host = url.hostname
    const port = url.port ? parseInt(url.port, 10) : undefined
    const user = url.username || undefined
    const database = url.pathname ? url.pathname.replace(/^\//, '') : undefined

    return {
      driverId,
      name: `${driverId}://${host}${port ? `:${port}` : ''}/${database || ''}`,
      host,
      port,
      user,
      database,
    }
  } catch {
    return {}
  }
}

export function toConnectionUri(profile: ConnectionProfile): string {
  if (profile.driverId === 'sqlite') {
    return `sqlite://${profile.host || ''}`
  }

  const scheme = DRIVER_TO_SCHEME[profile.driverId] || profile.driverId
  const user = profile.user ? `${encodeURIComponent(profile.user)}@` : ''
  const host = profile.host || 'localhost'
  const port = profile.port ? `:${profile.port}` : ''
  const db = profile.database ? `/${encodeURIComponent(profile.database)}` : ''

  // Never include password in exported URI
  return `${scheme}://${user}${host}${port}${db}`
}

export const DENIED_HOSTS_WEB = new Set([
  '169.254.169.254', // AWS/GCP/Azure instance metadata
  'metadata.google.internal',
  '100.100.100.200', // Alibaba Cloud metadata
  '0.0.0.0',
  '::',
])

export function validateHostPolicy(
  host: string,
  isWeb = false,
): { allowed: boolean; warning?: string; reason?: string } {
  if (!host) {
    return { allowed: false, reason: 'Host cannot be empty' }
  }

  const trimmed = host.trim().toLowerCase()

  if (isWeb) {
    if (DENIED_HOSTS_WEB.has(trimmed)) {
      return { allowed: false, reason: 'Access to cloud instance metadata services is denied for security.' }
    }

    if (trimmed === 'localhost' || trimmed === '127.0.0.1' || trimmed === '::1') {
      return {
        allowed: true,
        warning: 'Host resolves to the Corvus Web Server machine, not your local computer.',
      }
    }
  }

  return { allowed: true }
}
