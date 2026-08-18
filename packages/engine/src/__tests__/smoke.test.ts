import * as crypto from 'node:crypto'
import * as zlib from 'node:zlib'

export function testPackagingNativeModulesSmoke(): { passed: boolean; message?: string } {
  try {
    // 1. Verify Crypto module works (used for password hashing & token generation)
    const randomHex = crypto.randomBytes(16).toString('hex')
    if (randomHex.length !== 32) {
      return { passed: false, message: 'Native crypto module failed randomBytes generation' }
    }

    // 2. Verify Zlib module works (used for backup gzip compression)
    const input = Buffer.from('Corvus Database Studio Packaging Smoke Test', 'utf-8')
    const compressed = zlib.gzipSync(input)
    const decompressed = zlib.gunzipSync(compressed)

    if (decompressed.toString('utf-8') !== input.toString('utf-8')) {
      return { passed: false, message: 'Native zlib module failed round-trip gzip compression' }
    }

    return { passed: true }
  } catch (err: any) {
    return { passed: false, message: `Packaging smoke test threw error: ${err.message}` }
  }
}
