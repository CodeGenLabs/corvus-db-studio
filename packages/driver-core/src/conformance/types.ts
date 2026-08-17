import type { ResolvedProfile } from '../types'

export interface ConformanceSuiteOptions {
  profile: ResolvedProfile
  setupSql?: string
  cleanupSql?: string
}

export interface ConformanceTestResult {
  suite: string
  name: string
  passed: boolean
  durationMs: number
  error?: string
}

export interface ConformanceReport {
  driverId: string
  total: number
  passed: number
  failed: number
  results: ConformanceTestResult[]
}
