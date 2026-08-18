import { execSync } from 'node:child_process'
import * as fs from 'node:fs'

/**
 * Script to verify Authenticode EV code signature on Windows build artifacts using signtool
 */
export function verifyWindowsSignature(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    console.error(`[VerifySign] File not found: ${filePath}`)
    return false
  }

  try {
    const output = execSync(`signtool verify /pa /v "${filePath}"`, { encoding: 'utf-8' })
    console.log(`[VerifySign] Signature Valid:`, output)
    return true
  } catch (err: any) {
    console.warn(`[VerifySign] Signature verification failed or signtool not in PATH:`, err.message)
    return false
  }
}
