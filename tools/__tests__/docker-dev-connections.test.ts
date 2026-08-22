import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('docker-dev-connections.json seed profile', () => {
  const filePath = path.resolve(__dirname, '../../docker-dev-connections.json')

  it('file exists in repository root', () => {
    expect(fs.existsSync(filePath)).toBe(true)
  })

  it('contains all 8 supported database engines with correct dev ports', () => {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.version).toBe(1)
    expect(Array.isArray(parsed.connections)).toBe(true)
    expect(parsed.connections.length).toBe(8)

    const byDriver = new Map(parsed.connections.map((c: any) => [c.driverId, c]))
    expect(byDriver.has('postgres')).toBe(true)
    expect(byDriver.has('mysql')).toBe(true)
    expect(byDriver.has('mariadb')).toBe(true)
    expect(byDriver.has('mssql')).toBe(true)
    expect(byDriver.has('oracle')).toBe(true)
    expect(byDriver.has('mongodb')).toBe(true)
    expect(byDriver.has('redis')).toBe(true)
    expect(byDriver.has('sqlite')).toBe(true)

    // Port checks
    expect(byDriver.get('postgres').port).toBe(5432)
    expect(byDriver.get('mysql').port).toBe(3306)
    expect(byDriver.get('mariadb').port).toBe(3307)
    expect(byDriver.get('mssql').port).toBe(1434) // Must be 1434, never 1433
    expect(byDriver.get('oracle').port).toBe(1521)
    expect(byDriver.get('mongodb').port).toBe(27017)
    expect(byDriver.get('redis').port).toBe(6379)
  })
})