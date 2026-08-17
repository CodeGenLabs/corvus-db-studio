import crypto from 'node:crypto'
import type { SqliteDbLike } from '../migration'
import type { SecretRef, SecretVault } from './types'

export class EnvelopeVault implements SecretVault {
  private readonly masterKey: Buffer
  private readonly db?: SqliteDbLike
  private readonly memoryStore = new Map<string, { ciphertext: Buffer; iv: Buffer; tag: Buffer }>()

  constructor(masterKeyHexOrBase64: string, db?: SqliteDbLike) {
    if (!masterKeyHexOrBase64) {
      throw new Error('Master key is required for EnvelopeVault')
    }
    this.masterKey = Buffer.from(masterKeyHexOrBase64, 'hex').length === 32
      ? Buffer.from(masterKeyHexOrBase64, 'hex')
      : crypto.createHash('sha256').update(masterKeyHexOrBase64).digest()
    this.db = db
  }

  private deriveUserKey(ownerId: string): Buffer {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        this.masterKey,
        Buffer.alloc(0),
        Buffer.from(`user-${ownerId}`),
        32,
      ),
    )
  }

  private secretKey(ref: SecretRef): string {
    return `${ref.ownerId}:${ref.connectionId}:${ref.kind}`
  }

  async set(ref: SecretRef, value: string): Promise<void> {
    const key = this.deriveUserKey(ref.ownerId)
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    if (this.db) {
      const id = this.secretKey(ref)
      this.db
        .prepare(
          'INSERT INTO secret (id, owner_id, connection_id, kind, ciphertext, iv, tag, key_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET ciphertext=excluded.ciphertext, iv=excluded.iv, tag=excluded.tag, created_at=excluded.created_at',
        )
        .run(id, ref.ownerId, ref.connectionId, ref.kind, encrypted, iv, tag, new Date().toISOString())
    } else {
      this.memoryStore.set(this.secretKey(ref), { ciphertext: encrypted, iv, tag })
    }
  }

  async get(ref: SecretRef): Promise<string | undefined> {
    let entry: { ciphertext: Buffer; iv: Buffer; tag: Buffer } | undefined

    if (this.db) {
      const id = this.secretKey(ref)
      const row = this.db
        .prepare('SELECT ciphertext, iv, tag FROM secret WHERE id = ?')
        .get(id) as { ciphertext: Buffer; iv: Buffer; tag: Buffer } | undefined
      if (row) {
        entry = {
          ciphertext: Buffer.from(row.ciphertext),
          iv: Buffer.from(row.iv),
          tag: Buffer.from(row.tag),
        }
      }
    } else {
      entry = this.memoryStore.get(this.secretKey(ref))
    }

    if (!entry) return undefined

    const key = this.deriveUserKey(ref.ownerId)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, entry.iv)
    decipher.setAuthTag(entry.tag)
    const decrypted = Buffer.concat([decipher.update(entry.ciphertext), decipher.final()])
    return decrypted.toString('utf8')
  }

  async delete(ref: SecretRef): Promise<void> {
    if (this.db) {
      const id = this.secretKey(ref)
      this.db.prepare('DELETE FROM secret WHERE id = ?').run(id)
    } else {
      this.memoryStore.delete(this.secretKey(ref))
    }
  }
}
