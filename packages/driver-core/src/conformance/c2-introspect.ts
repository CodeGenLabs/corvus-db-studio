import type { DatabaseDriver } from '../types'
import type { ConformanceSuiteOptions, ConformanceTestResult } from './types'

export async function runC2IntrospectTests(
  driver: DatabaseDriver,
  options: ConformanceSuiteOptions,
): Promise<ConformanceTestResult[]> {
  const results: ConformanceTestResult[] = []

  // Test 1: listDatabases
  const start1 = Date.now()
  try {
    const conn = await driver.connect(options.profile)
    const dbs = await conn.introspect.listDatabases()
    await conn.close()

    results.push({
      suite: 'C2 Introspect',
      name: 'listDatabases returns array of database names',
      passed: Array.isArray(dbs) && dbs.length >= 0,
      durationMs: Date.now() - start1,
    })
  } catch (err) {
    results.push({
      suite: 'C2 Introspect',
      name: 'listDatabases returns array of database names',
      passed: false,
      durationMs: Date.now() - start1,
      error: (err as Error).message,
    })
  }

  // Test 2: listObjects returns table list
  const start2 = Date.now()
  try {
    const conn = await driver.connect(options.profile)
    const objects = await conn.introspect.listObjects({})
    await conn.close()

    results.push({
      suite: 'C2 Introspect',
      name: 'listObjects returns objects array without error',
      passed: Array.isArray(objects),
      durationMs: Date.now() - start2,
    })
  } catch (err) {
    results.push({
      suite: 'C2 Introspect',
      name: 'listObjects returns objects array without error',
      passed: false,
      durationMs: Date.now() - start2,
      error: (err as Error).message,
    })
  }

  return results
}
