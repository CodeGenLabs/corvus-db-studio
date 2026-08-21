import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('testenv · seed-coverage · đủ 11 đối tượng mẫu cho các engine (T015a, data-model.md §2)', () => {
  const seedRoot = path.resolve(__dirname, '../../../../../docker/dev-db/seed')

  const expectedObjects = [
    'country',
    'city',
    'types_probe',
    'customer',
    'order_log',
    'city_view',
    'customer_summary',
    'corvus_env_marker',
  ]

  function readEngineSeeds(engine: string): string {
    const dir = path.join(seedRoot, engine)
    const files = fs.readdirSync(dir)
    return files
      .filter((f) => f.endsWith('.sql') || f.endsWith('.js') || f.endsWith('.redis'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf-8'))
      .join('\n')
  }

  it('PostgreSQL seed chứa đủ các bảng, view, function, trigger, marker', () => {
    const content = readEngineSeeds('postgres')
    for (const obj of expectedObjects) {
      expect(content).toContain(obj)
    }
    expect(content).toContain('order details')
    expect(content).toContain('fn_customer_total')
    expect(content).toContain('trg_order_log_touch')
    expect(content).toContain('seed_version')
  })

  it('MySQL seed chứa đủ các bảng, view, routine, trigger, marker', () => {
    const content = readEngineSeeds('mysql')
    for (const obj of expectedObjects) {
      expect(content).toContain(obj)
    }
    expect(content).toContain('order details')
    expect(content).toContain('fn_customer_total')
    expect(content).toContain('trg_order_log_touch')
    expect(content).toContain('seed_version')
  })

  it('SQL Server seed chứa đủ các bảng, view, function, trigger, marker', () => {
    const content = readEngineSeeds('mssql')
    for (const obj of expectedObjects) {
      expect(content).toContain(obj)
    }
    expect(content).toContain('order details')
    expect(content).toContain('fn_customer_total')
    expect(content).toContain('trg_order_log_touch')
    expect(content).toContain('seed_version')
  })

  it('Oracle seed chứa đủ các bảng, view, function, trigger, marker', () => {
    const content = readEngineSeeds('oracle')
    for (const obj of expectedObjects) {
      expect(content).toContain(obj)
    }
    expect(content).toContain('order details')
    expect(content).toContain('fn_customer_total')
    expect(content).toContain('trg_order_log_touch')
    expect(content).toContain('seed_version')
  })

  it('SQLite seed chứa đủ các bảng, view, trigger, marker', () => {
    const content = readEngineSeeds('sqlite')
    for (const obj of expectedObjects) {
      expect(content).toContain(obj)
    }
    expect(content).toContain('order details')
    expect(content).toContain('trg_order_log_touch')
    expect(content).toContain('seed_version')
  })

  it('MongoDB seed chứa đủ các collection, index và marker', () => {
    const content = readEngineSeeds('mongodb')
    for (const obj of ['country', 'city', 'types_probe', 'customer', 'order_log', 'corvus_env_marker']) {
      expect(content).toContain(obj)
    }
    expect(content).toContain('order_details')
    expect(content).toContain('seed_version')
  })

  it('Redis seed chứa đủ các hash key và marker', () => {
    const content = readEngineSeeds('redis')
    expect(content).toContain('corvus:dev:country:')
    expect(content).toContain('corvus:dev:city:')
    expect(content).toContain('corvus:dev:customer:')
    expect(content).toContain('corvus:dev:marker')
    expect(content).toContain('seed_version')
  })
})
