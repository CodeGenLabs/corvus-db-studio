/**
 * Cách ly không gian chạy test và dọn dẹp không gian mồ côi.
 * T012, T013, research.md §R-3.
 */
import type { DatabaseDriver, ResolvedProfile } from '../types'
import { getTestEnvDialect, type EngineFamily } from './dialect'
import { assertSafetyLatch } from './resolve'

/**
 * Sinh tên không gian tạm ngẫu nhiên có tiền tố corvus_t_
 */
export function generateSpaceName(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const timestamp = Date.now().toString(36)
  return `corvus_t_${rand}_${timestamp}`
}

/**
 * Bao bọc việc chạy test trong một không gian riêng biệt, tự tạo và tự huỷ sạch trong `finally`.
 */
export async function withIsolatedSpace<T>(
  driver: DatabaseDriver,
  baseProfile: ResolvedProfile,
  fn: (isolatedProfile: ResolvedProfile, spaceName: string) => Promise<T>,
): Promise<T> {
  await assertSafetyLatch(baseProfile)

  const family = baseProfile.driverId as EngineFamily
  const dialect = getTestEnvDialect(family)
  const spaceName = generateSpaceName()

  // Tạo không gian tạm
  if (dialect.createSpaceSql) {
    const conn = await driver.connect(baseProfile)
    try {
      for (const sql of dialect.createSpaceSql(spaceName)) {
        for await (const _ of conn.execute({ sql })) {
          /* DDL */
        }
      }
    } finally {
      await conn.close()
    }
  }

  // Chuẩn bị profile đã cách ly
  let isolatedProfile: ResolvedProfile = { ...baseProfile }

  if (family === 'mysql' || family === 'mariadb' || family === 'mongodb') {
    isolatedProfile = { ...baseProfile, database: spaceName }
  } else if (family === 'sqlite' && dialect.getTempSqlitePath) {
    isolatedProfile = {
      ...baseProfile,
      database: dialect.getTempSqlitePath(spaceName),
    }
  }

  try {
    return await fn(isolatedProfile, spaceName)
  } finally {
    // Dọn sạch không gian tạm
    if (dialect.dropSpaceSql) {
      try {
        const conn = await driver.connect(baseProfile)
        try {
          for (const sql of dialect.dropSpaceSql(spaceName)) {
            for await (const _ of conn.execute({ sql })) {
              /* DROP */
            }
          }
        } finally {
          await conn.close()
        }
      } catch (err) {
        console.warn(
          `[withIsolatedSpace] Không thể dọn dẹp không gian tạm ${spaceName}:`,
          err,
        )
      }
    }
  }
}

/**
 * Quét và dọn sạch các schema/database corvus_t_* bị mồ côi từ những lần test trước (T013)
 */
export async function cleanupOrphanSpaces(
  driver: DatabaseDriver,
  baseProfile: ResolvedProfile,
): Promise<string[]> {
  await assertSafetyLatch(baseProfile)

  const family = baseProfile.driverId as EngineFamily
  const dialect = getTestEnvDialect(family)

  if (!dialect.listOrphanSpacesSql || !dialect.dropSpaceSql) {
    return []
  }

  const cleanedSpaces: string[] = []
  const conn = await driver.connect(baseProfile)

  try {
    const orphanSpaces: string[] = []
    for await (const chunk of conn.execute({
      sql: dialect.listOrphanSpacesSql(),
    })) {
      for (const row of chunk.rows) {
        const space = (row as Array<{ v: unknown }>)[0]?.v
        if (typeof space === 'string' && space.toLowerCase().startsWith('corvus_t_')) {
          orphanSpaces.push(space)
        }
      }
    }

    for (const space of orphanSpaces) {
      for (const dropSql of dialect.dropSpaceSql(space)) {
        for await (const _ of conn.execute({ sql: dropSql })) {
          /* DROP */
        }
      }
      cleanedSpaces.push(space)
    }
  } finally {
    await conn.close()
  }

  return cleanedSpaces
}
