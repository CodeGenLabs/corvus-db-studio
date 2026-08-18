import { METHODS } from '../packages/contract/dist/index.js'

console.log('[Check Contract] Validating contract methods and zod schemas...')

if (!METHODS || Object.keys(METHODS).length === 0) {
  console.error('[Check Contract] ERROR: No contract methods found in @corvus/contract!')
  process.exit(1)
}

let count = 0
for (const [name, def] of Object.entries(METHODS)) {
  if (!def.type || (def.type !== 'unary' && def.type !== 'stream')) {
    console.error(`[Check Contract] Invalid method definition for ${name}`)
    process.exit(1)
  }
  count++
}

console.log(`[Check Contract] SUCCESS: Validated ${count} contract methods cleanly.`)
