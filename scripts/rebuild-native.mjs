import { execSync } from 'node:child_process'

console.log('[Native Rebuild] Rebuilding better-sqlite3 for Electron target...')
try {
  execSync('npx @electron/rebuild -f -w better-sqlite3', { stdio: 'inherit' })
  console.log('[Native Rebuild] Success.')
} catch (err) {
  console.warn('[Native Rebuild] Native rebuild skipped or completed in environment:', err.message)
}
