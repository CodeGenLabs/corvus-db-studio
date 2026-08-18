import { VI, EN, JA } from './dictionaries'

export interface I18nValidationResult {
  passed: boolean
  missingInEn: string[]
  missingInJa: string[]
  totalKeys: number
}

/**
 * Validates dictionary key completeness across VI, EN, JA
 */
export function validateI18nCompleteness(): I18nValidationResult {
  const viKeys = Object.keys(VI)
  const enKeys = new Set(Object.keys(EN))
  const jaKeys = new Set(Object.keys(JA))

  const missingInEn: string[] = []
  const missingInJa: string[] = []

  for (const key of viKeys) {
    if (!enKeys.has(key)) missingInEn.push(key)
    if (!jaKeys.has(key)) missingInJa.push(key)
  }

  const passed = missingInEn.length === 0 && missingInJa.length === 0

  return {
    passed,
    missingInEn,
    missingInJa,
    totalKeys: viKeys.length,
  }
}
