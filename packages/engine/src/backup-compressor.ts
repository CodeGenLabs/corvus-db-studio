import * as zlib from 'node:zlib'
import * as crypto from 'node:crypto'

export class BackupCompressor {
  public static async compressGzip(data: Buffer | string): Promise<{ compressed: Buffer; sha256: string }> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8')
    const compressed = zlib.gzipSync(buffer)
    const sha256 = crypto.createHash('sha256').update(compressed).digest('hex')
    return { compressed, sha256 }
  }

  public static async decompressGzip(compressedData: Buffer): Promise<Buffer> {
    return zlib.gunzipSync(compressedData)
  }

  public static verifyChecksum(data: Buffer, expectedSha256: string): boolean {
    const actual = crypto.createHash('sha256').update(data).digest('hex')
    return actual.toLowerCase() === expectedSha256.toLowerCase()
  }
}
