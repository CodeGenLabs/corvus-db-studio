import type { SecretRef, SecretVault } from './types'

export class InMemoryVault implements SecretVault {
  private readonly store = new Map<string, string>()

  private secretKey(ref: SecretRef): string {
    return `${ref.ownerId}:${ref.connectionId}:${ref.kind}`
  }

  async set(ref: SecretRef, value: string): Promise<void> {
    this.store.set(this.secretKey(ref), value)
  }

  async get(ref: SecretRef): Promise<string | undefined> {
    return this.store.get(this.secretKey(ref))
  }

  async delete(ref: SecretRef): Promise<void> {
    this.store.delete(this.secretKey(ref))
  }
}
