export type DriverId =
  | 'postgres'
  | 'mysql'
  | 'mariadb'
  | 'sqlite'
  | 'mssql'
  | 'oracle'
  | 'mongodb'
  | 'redis'

export interface SslConfig {
  mode: 'disable' | 'require' | 'verify-ca' | 'verify-full'
  caCert?: string
  clientCert?: string
  clientKey?: string
}

export interface SshConfig {
  enabled: boolean
  host: string
  port: number
  username: string
  authType: 'password' | 'key' | 'agent'
  privateKey?: string
  passphrase?: string
}

export interface ConnectionProfile {
  id: string
  name: string
  driverId: DriverId
  host?: string
  port?: number
  database?: string
  user?: string
  ssl?: SslConfig
  ssh?: SshConfig
  readOnly?: boolean
  color?: string
  group?: string
}
