import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const mainDist = path.resolve(currentDir, '../../dist/index.cjs')
const preloadDist = path.resolve(currentDir, '../../../preload/dist/index.cjs')

describe('T-B03 · Desktop Production Dist Smoke Test', () => {
  it('apps/desktop/main/dist/index.cjs được build đầy đủ và hợp lệ', () => {
    expect(fs.existsSync(mainDist)).toBe(true)
    const content = fs.readFileSync(mainDist, 'utf8')
    expect(content.length).toBeGreaterThan(1000)
    expect(content).toContain('BrowserWindow')
  })

  it('apps/desktop/preload/dist/index.cjs được build đầy đủ và hợp lệ', () => {
    expect(fs.existsSync(preloadDist)).toBe(true)
    const content = fs.readFileSync(preloadDist, 'utf8')
    expect(content.length).toBeGreaterThan(100)
    expect(content).toContain('exposeCorvusBridge')
  })
})
