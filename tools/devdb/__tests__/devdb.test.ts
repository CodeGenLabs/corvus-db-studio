import { describe, expect, it } from 'vitest'
import { checkEngineState, parseArgs } from '../index'
import { getEffectiveEngineConfig } from '../ports'

describe('devdb · CLI arguments & port configuration (T033, SC-001..SC-003)', () => {
  it('parseArgs phân tích chính xác các lệnh cơ bản', () => {
    expect(parseArgs(['up'])).toEqual({ command: 'up', only: undefined, drop: false })
    expect(parseArgs(['down'])).toEqual({ command: 'down', only: undefined, drop: false })
    expect(parseArgs(['reset'])).toEqual({ command: 'reset', only: undefined, drop: false })
    expect(parseArgs(['wait'])).toEqual({ command: 'wait', only: undefined, drop: false })
    expect(parseArgs(['doctor'])).toEqual({ command: 'doctor', only: undefined, drop: false })
  })

  it('parseArgs phân tích cờ --only và --drop', () => {
    const res1 = parseArgs(['up', '--only', 'postgres,sqlite'])
    expect(res1.command).toBe('up')
    expect(res1.only).toEqual(['postgres', 'sqlite'])

    const res2 = parseArgs(['bulk', '--drop', '--only=mysql'])
    expect(res2.command).toBe('bulk')
    expect(res2.drop).toBe(true)
    expect(res2.only).toEqual(['mysql'])
  })

  it('DEV_DB_ENV đảm bảo port SQL Server là 1434 (tránh 1433 của máy host)', () => {
    const mssql = getEffectiveEngineConfig('mssql')
    expect(mssql.port).toBe(1434)
    expect(mssql.port).not.toBe(1433)
  })

  it('DEV_DB_ENV đảm bảo port MariaDB là 3307 (tránh trùng MySQL 3306)', () => {
    const mariadb = getEffectiveEngineConfig('mariadb')
    const mysql = getEffectiveEngineConfig('mysql')
    expect(mariadb.port).toBe(3307)
    expect(mysql.port).toBe(3306)
    expect(mariadb.port).not.toBe(mysql.port)
  })

  it('checkEngineState trả về trạng thái hợp lệ cho các engine', async () => {
    const pgState = await checkEngineState('postgres')
    expect(['NOT_STARTED', 'STARTING', 'SEEDED', 'DEGRADED']).toContain(pgState.state)

    const sqliteState = await checkEngineState('sqlite')
    expect(['NOT_STARTED', 'SEEDED']).toContain(sqliteState.state)
  })
})
