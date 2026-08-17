import fs from 'node:fs'
import path from 'node:path'

export type HostKeyVerificationStatus = 'trusted' | 'new' | 'changed'

export interface HostKeyEntry {
  host: string
  port: number
  keyType: string
  fingerprint: string
}

export class KnownHostsManager {
  private readonly filePath: string
  private readonly entries = new Map<string, HostKeyEntry>()

  constructor(filePath: string) {
    this.filePath = filePath
    this.load()
  }

  private hostKey(host: string, port: number): string {
    return `${host}:${port}`
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) return

    try {
      const content = fs.readFileSync(this.filePath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 3) {
          const [hostPort, keyType, fingerprint] = parts
          const [host, portStr] = hostPort!.split(':')
          const port = portStr ? parseInt(portStr, 10) : 22
          if (host && keyType && fingerprint) {
            this.entries.set(this.hostKey(host, port), { host, port, keyType, fingerprint })
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const lines: string[] = []
      for (const entry of this.entries.values()) {
        lines.push(`${entry.host}:${entry.port} ${entry.keyType} ${entry.fingerprint}`)
      }
      fs.writeFileSync(this.filePath, lines.join('\n') + '\n', 'utf8')
    } catch {
      // Ignore save errors
    }
  }

  verifyHostKey(host: string, port: number, fingerprint: string): HostKeyVerificationStatus {
    const key = this.hostKey(host, port)
    const existing = this.entries.get(key)
    if (!existing) {
      return 'new'
    }
    if (existing.fingerprint === fingerprint) {
      return 'trusted'
    }
    // Host key changed! MITM risk!
    return 'changed'
  }

  trustHostKey(host: string, port: number, keyType: string, fingerprint: string): void {
    const key = this.hostKey(host, port)
    this.entries.set(key, { host, port, keyType, fingerprint })
    this.save()
  }
}
