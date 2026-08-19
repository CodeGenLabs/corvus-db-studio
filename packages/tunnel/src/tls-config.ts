import type tls from 'node:tls'
import fs from 'node:fs'

export interface TlsOptionsInput {
  sslMode: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full'
  caPath?: string
  certPath?: string
  keyPath?: string
  rejectUnauthorized?: boolean
}

export function buildTlsOptions(options: TlsOptionsInput): tls.ConnectionOptions | false {
  if (options.sslMode === 'disable') {
    return false
  }

  const tlsConfig: tls.ConnectionOptions = {
    rejectUnauthorized: options.sslMode === 'verify-ca' || options.sslMode === 'verify-full',
  }

  if (options.caPath && fs.existsSync(options.caPath)) {
    tlsConfig.ca = fs.readFileSync(options.caPath)
  }

  if (options.certPath && fs.existsSync(options.certPath)) {
    tlsConfig.cert = fs.readFileSync(options.certPath)
  }

  if (options.keyPath && fs.existsSync(options.keyPath)) {
    tlsConfig.key = fs.readFileSync(options.keyPath)
  }

  return tlsConfig
}
