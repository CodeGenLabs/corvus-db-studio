import { describe, expect, it } from 'vitest'
import {
  assertSafetyLatch,
  getDockerTestProfile,
  getEffectiveEngineConfig,
  isLoopbackHost,
} from '../resolve'

describe('testenv · resolve · chốt an toàn SR-005', () => {
  it('isLoopbackHost nhận diện chính xác các địa chỉ nội bộ', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('::1')).toBe(true)
    expect(isLoopbackHost('127.0.0.2')).toBe(true)
    expect(isLoopbackHost('(tệp)')).toBe(true)
    expect(isLoopbackHost('')).toBe(true)

    // Các host bên ngoài phải trả false
    expect(isLoopbackHost('192.168.1.100')).toBe(false)
    expect(isLoopbackHost('10.0.0.1')).toBe(false)
    expect(isLoopbackHost('prod-db.internal.corp')).toBe(false)
    expect(isLoopbackHost('aws.rds.amazonaws.com')).toBe(false)
  })

  it('Lớp 1: assertSafetyLatch từ chối host không phải loopback', async () => {
    const foreignProfile = getDockerTestProfile('postgres', {
      host: '192.168.1.50',
    })
    await expect(assertSafetyLatch(foreignProfile)).rejects.toThrow(
      /CHỐT AN TOÀN SR-005.*Host.*không phải loopback/i,
    )
  })

  it('Lớp 2: assertSafetyLatch từ chối cổng 1433 của SQL Server', async () => {
    const unsafeMssql = getDockerTestProfile('mssql', {
      port: 1433,
    })
    await expect(assertSafetyLatch(unsafeMssql)).rejects.toThrow(
      /Cổng 1433 là cổng dịch vụ SQL Server riêng của máy host/i,
    )
  })

  it('Lớp 2: SQL Server trên cổng dev 1434 được chấp thuận', async () => {
    const safeMssql = getDockerTestProfile('mssql', {
      port: 1434,
    })
    await expect(assertSafetyLatch(safeMssql)).resolves.toBeUndefined()
  })

  it('Lớp 3: assertSafetyLatch từ chối nếu markerCheckFn trả về false', async () => {
    const safeProfile = getDockerTestProfile('postgres')
    await expect(
      assertSafetyLatch(safeProfile, async () => false),
    ).rejects.toThrow(/Không tìm thấy dấu hiệu corvus_env_marker/i)
  })

  it('Lớp 3: assertSafetyLatch thành công khi markerCheckFn trả về true', async () => {
    const safeProfile = getDockerTestProfile('postgres')
    await expect(
      assertSafetyLatch(safeProfile, async () => true),
    ).resolves.toBeUndefined()
  })

  it('getEffectiveEngineConfig trả về đúng thông số mặc định cho 8 engine', () => {
    const pg = getEffectiveEngineConfig('postgres')
    expect(pg.port).toBe(5432)
    expect(pg.database).toBe('corvus_dev')

    const mssql = getEffectiveEngineConfig('mssql')
    expect(mssql.port).toBe(1434) // An toàn, khác 1433

    const mariadb = getEffectiveEngineConfig('mariadb')
    expect(mariadb.port).toBe(3307) // An toàn, khác 3306

    const redis = getEffectiveEngineConfig('redis')
    expect(redis.port).toBe(6379)
  })
})
