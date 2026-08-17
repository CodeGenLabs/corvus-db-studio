import type { DatabaseDriver } from '../types'
import { runC1ConnectTests } from './c1-connect'
import { runC2IntrospectTests } from './c2-introspect'
import type { ConformanceReport, ConformanceSuiteOptions } from './types'

export async function runConformanceSuite(
  driver: DatabaseDriver,
  options: ConformanceSuiteOptions,
): Promise<ConformanceReport> {
  const c1Results = await runC1ConnectTests(driver, options)
  const c2Results = await runC2IntrospectTests(driver, options)

  const allResults = [...c1Results, ...c2Results]
  const passed = allResults.filter((r) => r.passed).length
  const failed = allResults.length - passed

  return {
    driverId: driver.id,
    total: allResults.length,
    passed,
    failed,
    results: allResults,
  }
}
