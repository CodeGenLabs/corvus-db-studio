import fs from 'node:fs'
import path from 'node:path'
import type { SecretRef, SecretVault } from './types'

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
}

export class OsKeychainVault implements SecretVault {
  private readonly filePath: string
  private readonly adapter?: SafeStorageAdapter
  private readonly cache = new Map<string, string>()

  constructor(secretsFilePath: string, adapter?: SafeStorageAdapter) {
    this.filePath = secretsFilePath
    this.adapter = adapter
    this.load()
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) return
    try {
      const buffer = fs.readFileSync(this.filePath)
      if (this.adapter && this.adapter.isEncryptionAvailable()) {
        const decryptedJson = this.adapter.decryptString(buffer)
        const obj = JSON.parse(decryptedJson)
        for (const [k, v] of Object.entries(obj)) {
          this.cache.set(k, String(v))
        }
      }
    } catch {
      // Ignore corrupted cache
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      const obj: Record<string, string> = {}
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v
      }
      const json = JSON.stringify(obj)

      if (this.adapter && this.adapter.isEncryptionAvailable()) {
        const encrypted = this.adapter.encryptString(json)
        fs.writeFileSync(this.filePath, encrypted)
      } else {
        fs.writeFileSync(this.filePath, Buffer.from(json, 'utf8'))
      }
    } catch {
      // Ignore file save errors
    }
  }

  private secretKey(ref: SecretRef): string {
    return `${ref.ownerId}:${ref.connectionId}:${ref.kind}`
  }

  async set(ref: SecretRef, value: string): Promise<void> {
    this.cache.set(this.secretKey(ref), value)
    this.save()
  }

  async get(ref: SecretRef): Promise<string | undefined> {
    return this.cache.get(this.secretKey(ref))
  }

  async delete(ref: SecretRef): Promise<void> {
    this.cache.delete(this.secretKey(ref))
    this.save()
  }
}
