export interface SshTunnelConfig {
  sshHost: string
  sshPort: number
  sshUser: string
  sshPassword?: string
  privateKey?: string
  passphrase?: string
  remoteHost: string
  remotePort: number
}

export interface ActiveTunnel {
  localPort: number
  refCount: number
  idleTimer: NodeJS.Timeout | null
  close(): Promise<void>
}

export class SshTunnelManager {
  private readonly tunnels = new Map<string, ActiveTunnel>()
  private readonly idleGraceMs: number

  constructor(idleGraceMs = 30_000) {
    this.idleGraceMs = idleGraceMs
  }

  private tunnelKey(config: SshTunnelConfig): string {
    return `${config.sshUser}@${config.sshHost}:${config.sshPort}->${config.remoteHost}:${config.remotePort}`
  }

  async acquire(config: SshTunnelConfig): Promise<{ localPort: number; release: () => void }> {
    const key = this.tunnelKey(config)
    let tunnel = this.tunnels.get(key)

    if (tunnel) {
      tunnel.refCount++
      if (tunnel.idleTimer) {
        clearTimeout(tunnel.idleTimer)
        tunnel.idleTimer = null
      }
    } else {
      const localPort = 10000 + Math.floor(Math.random() * 50000)
      tunnel = {
        localPort,
        refCount: 1,
        idleTimer: null,
        close: async () => {
          this.tunnels.delete(key)
        },
      }
      this.tunnels.set(key, tunnel)
    }

    const currentTunnel = tunnel
    const release = () => {
      currentTunnel.refCount--
      if (currentTunnel.refCount <= 0) {
        currentTunnel.idleTimer = setTimeout(() => {
          currentTunnel.close()
        }, this.idleGraceMs)
      }
    }

    return { localPort: currentTunnel.localPort, release }
  }

  async closeAll(): Promise<void> {
    for (const tunnel of this.tunnels.values()) {
      if (tunnel.idleTimer) clearTimeout(tunnel.idleTimer)
      await tunnel.close()
    }
    this.tunnels.clear()
  }
}
