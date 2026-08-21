import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('no-dev-credential-in-image (SR-001, SC-012)', () => {
  const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile')
  const dockerignorePath = path.resolve(process.cwd(), '.dockerignore')

  it('Dockerfile không copy các file cấu hình dev / dev-db vào runtime stage', () => {
    expect(fs.existsSync(dockerfilePath)).toBe(true)
    const content = fs.readFileSync(dockerfilePath, 'utf8')

    expect(content).not.toContain('COPY docker/dev-db')
    expect(content).not.toContain('COPY .env')
    expect(content).not.toContain('DEV_DB_')
    expect(content).not.toContain('corvus_dev_pw')
  })

  it('.dockerignore bỏ qua .env* và docker/dev-db', () => {
    expect(fs.existsSync(dockerignorePath)).toBe(true)
    const content = fs.readFileSync(dockerignorePath, 'utf8')

    expect(content).toContain('.env')
    expect(content).toContain('docker/dev-db')
  })
})
