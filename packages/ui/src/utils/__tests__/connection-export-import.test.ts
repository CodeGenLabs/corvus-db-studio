import { describe, it, expect } from 'vitest'
import { serializeConnectionsBackup, parseConnectionsBackup } from '../connection-export-import'
import type { ConnectionProfile } from '@corvus/contract'

describe('connection-export-import utilities', () => {
  const sampleProfiles: ConnectionProfile[] = [
    {
      id: 'conn-1',
      name: 'PostgreSQL Dev',
      driverId: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'corvus_dev',
      user: 'corvus_dev',
    },
    {
      id: 'conn-2',
      name: 'MySQL Dev',
      driverId: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      database: 'corvus_dev',
      user: 'corvus_dev',
    },
  ]

  it('serializes connection profiles into a standard backup JSON string', () => {
    const json = serializeConnectionsBackup(sampleProfiles)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.connections).toHaveLength(2)
    expect(parsed.connections[0].name).toBe('PostgreSQL Dev')
    expect(parsed.connections[0].driverId).toBe('postgres')
    expect(parsed.exportedAt).toBeDefined()
  })

  it('parses valid backup JSON string with version envelope', () => {
    const json = serializeConnectionsBackup(sampleProfiles)
    const result = parseConnectionsBackup(json)
    expect(result.valid).toBe(true)
    expect(result.connections).toHaveLength(2)
    expect(result.connections[0].name).toBe('PostgreSQL Dev')
    expect(result.connections[1].driverId).toBe('mysql')
  })

  it('parses valid raw array of connections for flexible migration', () => {
    const rawJson = JSON.stringify(sampleProfiles)
    const result = parseConnectionsBackup(rawJson)
    expect(result.valid).toBe(true)
    expect(result.connections).toHaveLength(2)
    expect(result.connections[0].id).toBe('conn-1')
  })

  it('returns invalid on invalid JSON string', () => {
    const result = parseConnectionsBackup('invalid json')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.connections).toHaveLength(0)
  })

  it('returns invalid when no connections array or objects exist', () => {
    const result = parseConnectionsBackup(JSON.stringify({ someKey: 123 }))
    expect(result.valid).toBe(false)
    expect(result.connections).toHaveLength(0)
  })
})