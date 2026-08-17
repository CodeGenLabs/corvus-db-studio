export interface SecretRef {
  kind: 'db-password' | 'ssh-key' | 'ssh-passphrase' | 'tls-key' | 'ai-api-key'
  ownerId: string
  connectionId: string
}

export interface SecretVault {
  set(ref: SecretRef, value: string): Promise<void>
  get(ref: SecretRef): Promise<string | undefined>
  delete(ref: SecretRef): Promise<void>
}
