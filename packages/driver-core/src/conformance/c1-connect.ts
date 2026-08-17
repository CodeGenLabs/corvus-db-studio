import type { DatabaseDriver } from '../types'
import type { ConformanceSuiteOptions, ConformanceTestResult } from './types'

export async function runC1ConnectTests(
  driver: DatabaseDriver,
  options: ConformanceSuiteOptions,
): Promise<ConformanceTestResult[]> {
  const results: ConformanceTestResult[] = []

  // Test 1: Connect and Ping
  const start1 = Date.now()
  try {
    const conn = await driver.connect(options.profile)
    const latency = await conn.ping()
    await conn.close()

    results.push({
      suite: 'C1 Connect',
      name: 'connect and ping should succeed with valid profile',
      passed: typeof latency === 'number' && latency >= 0,
      durationMs: Date.now() - start1,
    })
  } catch (err) {
    results.push({
      suite: 'C1 Connect',
      name: 'connect and ping should succeed with valid profile',
      passed: false,
      durationMs: Date.now() - start1,
      error: (err as Error).message,
    })
  }

  // Test 2: Server Version and Capabilities populated
  const start2 = Date.now()
  try {
    const conn = await driver.connect(options.profile)
    const hasVersion = Boolean(conn.serverVersion && conn.serverVersion.raw)
    const hasCaps = Boolean(conn.capabilities && conn.capabilities.objects)
    await conn.close()

    results.push({
      suite: 'C1 Connect',
      name: 'connection exposes serverVersion and capabilities',
      passed: hasVersion && hasCaps,
      durationMs: Date.now() - start2,
    })
  } catch (err) {
    results.push({
      suite: 'C1 Connect',
      name: 'connection exposes serverVersion and capabilities',
      passed: false,
      durationMs: Date.now() - start2,
      error: (err as Error).message,
    })
  }

  return results
}
