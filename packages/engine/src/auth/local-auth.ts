import * as crypto from 'node:crypto'

export class LocalAccountAuth {
  /**
   * Secure password hashing using PBKDF2 with 100,000 iterations and 64-byte salt
   */
  public static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(32).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex')
    return { hash, salt }
  }

  public static verifyPassword(password: string, expectedHash: string, salt: string): boolean {
    const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
  }
}
