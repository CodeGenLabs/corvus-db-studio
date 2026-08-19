import { describe, expect, it } from 'vitest'
import { parseConnectionUri, toConnectionUri, validateHostPolicy, URI_SHAPE } from '../uri'
import type { ConnectionProfile, DriverId } from '../models'

describe('URI parser and serializer (T-B02)', () => {
  const driverProfiles: Array<{
    driverId: DriverId
    profile: ConnectionProfile
    expectedUri: string
  }> = [
    {
      driverId: 'postgres',
      profile: {
        id: 'conn-1',
        name: 'PG DB',
        driverId: 'postgres',
        host: 'localhost',
        port: 5432,
        user: 'postgres_user',
        database: 'mydb',
      },
      expectedUri: 'postgresql://postgres_user@localhost:5432/mydb',
    },
    {
      driverId: 'mysql',
      profile: {
        id: 'conn-2',
        name: 'MySQL DB',
        driverId: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        database: 'shop_db',
      },
      expectedUri: 'mysql://root@127.0.0.1:3306/shop_db',
    },
    {
      driverId: 'mariadb',
      profile: {
        id: 'conn-3',
        name: 'MariaDB',
        driverId: 'mariadb',
        host: 'db.local',
        port: 3306,
        user: 'admin',
        database: 'production',
      },
      expectedUri: 'mariadb://admin@db.local:3306/production',
    },
    {
      driverId: 'sqlite',
      profile: {
        id: 'conn-4',
        name: 'my database.sqlite',
        driverId: 'sqlite',
        host: '/path/with spaces/and unicode/dữ liệu.db',
      },
      expectedUri: 'sqlite:///path/with spaces/and unicode/dữ liệu.db',
    },
    {
      driverId: 'mssql',
      profile: {
        id: 'conn-5',
        name: 'MSSQL DB',
        driverId: 'mssql',
        host: 'mssql.internal',
        port: 1433,
        user: 'sa',
        database: 'master',
      },
      expectedUri: 'sqlserver://sa@mssql.internal:1433/master',
    },
    {
      driverId: 'oracle',
      profile: {
        id: 'conn-6',
        name: 'Oracle DB',
        driverId: 'oracle',
        host: 'oracle.internal',
        port: 1521,
        user: 'system',
        database: 'XE',
      },
      expectedUri: 'oracle://system@oracle.internal:1521/XE',
    },
    {
      driverId: 'mongodb',
      profile: {
        id: 'conn-7',
        name: 'MongoDB',
        driverId: 'mongodb',
        host: 'mongo.cluster',
        port: 27017,
        user: 'mongo_admin',
        database: 'analytics',
      },
      expectedUri: 'mongodb://mongo_admin@mongo.cluster:27017/analytics',
    },
    {
      driverId: 'redis',
      profile: {
        id: 'conn-8',
        name: 'Redis',
        driverId: 'redis',
        host: 'redis.cache',
        port: 6379,
      },
      expectedUri: 'redis://redis.cache:6379',
    },
  ]

  it('covers all 8 DriverId entries in URI_SHAPE lookup table', () => {
    const allDriverIds: DriverId[] = [
      'postgres',
      'mysql',
      'mariadb',
      'sqlite',
      'mssql',
      'oracle',
      'mongodb',
      'redis',
    ]
    for (const d of allDriverIds) {
      expect(URI_SHAPE[d]).toBeDefined()
      expect(typeof URI_SHAPE[d].scheme).toBe('string')
      expect(typeof URI_SHAPE[d].usesFilePath).toBe('boolean')
    }
  })

  it.each(driverProfiles)(
    'round-trip parse & serialize for $driverId',
    ({ profile, expectedUri }) => {
      const serialized = toConnectionUri(profile)
      expect(serialized).toBe(expectedUri)

      const parsed = parseConnectionUri(serialized)
      expect(parsed.driverId).toBe(profile.driverId)
      expect(parsed.host).toBe(profile.host)
      if (profile.port) expect(parsed.port).toBe(profile.port)
      if (profile.user) expect(parsed.user).toBe(profile.user)
      if (profile.database) expect(parsed.database).toBe(profile.database)
    },
  )

  it('parses SQLite uri with encoded spaces and unicode characters', () => {
    const uri = 'sqlite:///D:/workspace/database%20khoa%20h%E1%BB%8Dc/d%E1%BB%AF%20li%E1%BB%87u.db'
    const parsed = parseConnectionUri(uri)
    expect(parsed.driverId).toBe('sqlite')
    expect(parsed.host).toBe('/D:/workspace/database khoa học/dữ liệu.db')
    expect(parsed.name).toBe('dữ liệu.db')
  })

  it('handles invalid URIs gracefully', () => {
    expect(parseConnectionUri('invalid-uri')).toEqual({})
    expect(parseConnectionUri('')).toEqual({})
  })

  it('validates host policy correctly', () => {
    expect(validateHostPolicy('')).toEqual({ allowed: false, reason: 'Host cannot be empty' })
    expect(validateHostPolicy('169.254.169.254', true).allowed).toBe(false)
    expect(validateHostPolicy('metadata.google.internal', true).allowed).toBe(false)
    expect(validateHostPolicy('localhost', true)).toEqual({
      allowed: true,
      warning: 'Host resolves to the Corvus Web Server machine, not your local computer.',
    })
    expect(validateHostPolicy('db.company.com', true)).toEqual({ allowed: true })
  })
})
