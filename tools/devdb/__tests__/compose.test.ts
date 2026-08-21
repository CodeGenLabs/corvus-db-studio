import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('devdb · compose.yaml verification (T018, SR-002, FR-004, R-1)', () => {
  const composePath = path.resolve(
    __dirname,
    '../../../docker/dev-db/compose.yaml',
  )
  const content = fs.readFileSync(composePath, 'utf-8')

  it('compose.yaml tồn tại và chứa đầy đủ 7 service container', () => {
    const services = [
      'postgres:',
      'mysql:',
      'mariadb:',
      'mssql:',
      'oracle:',
      'mongodb:',
      'redis:',
    ]
    for (const s of services) {
      expect(content).toContain(s)
    }
  })

  it('SR-002: Mọi ánh xạ cổng (ports) đều bind tường minh vào 127.0.0.1:', () => {
    const portLines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- "') && l.includes(':'))

    expect(portLines.length).toBeGreaterThanOrEqual(7)
    for (const line of portLines) {
      expect(
        line,
        `Dòng ánh xạ cổng không bind 127.0.0.1: ${line}`,
      ).toMatch(/-\s*"127\.0\.0\.1:/)
    }
  })

  it('TUYỆT ĐỐI KHÔNG CÓ port mapping nào map vào 127.0.0.1:1433:', () => {
    expect(content).not.toContain('"127.0.0.1:1433:')
    expect(content).not.toContain('DEV_DB_MSSQL_PORT:-1433')
    expect(content).toContain('DEV_DB_MSSQL_PORT:-1434')
  })

  it('FR-004: Mọi service container đều có cấu hình healthcheck', () => {
    const lines = content.split('\n')
    let healthcheckCount = 0
    for (const line of lines) {
      if (line.trim() === 'healthcheck:') {
        healthcheckCount++
      }
    }
    expect(healthcheckCount).toBe(7)
  })

  it('R-1: Image tags khớp chính xác với phiên bản đã chốt', () => {
    expect(content).toContain('image: postgres:16-alpine')
    expect(content).toContain('image: mysql:8.0')
    expect(content).toContain('image: mariadb:11.4')
    expect(content).toContain('image: mcr.microsoft.com/mssql/server:2022-latest')
    expect(content).toContain('image: gvenzl/oracle-free:23-slim')
    expect(content).toContain('image: mongo:7')
    expect(content).toContain('image: redis:7-alpine')
  })
})
