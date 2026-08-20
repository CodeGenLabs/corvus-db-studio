import { describe, expect, it } from 'vitest'
import { levelsOf } from '../levels'

describe('levelsOf(caps) (T009/T010)', () => {
  it('returns [database, namespace] when both catalogs and schemas are supported (PostgreSQL, SQL Server)', () => {
    const result = levelsOf({ hasCatalogs: true, hasSchemas: true })
    expect(result).toEqual(['database', 'namespace'])
  })

  it('returns [database] when only catalogs are supported (MySQL, MongoDB, Redis, SQLite with ODQ-1)', () => {
    const result = levelsOf({ hasCatalogs: true, hasSchemas: false })
    expect(result).toEqual(['database'])
  })

  it('returns [namespace] when only schemas are supported (Oracle)', () => {
    const result = levelsOf({ hasCatalogs: false, hasSchemas: true })
    expect(result).toEqual(['namespace'])
  })

  it('returns [] when neither is supported (Flat SQLite)', () => {
    const result = levelsOf({ hasCatalogs: false, hasSchemas: false })
    expect(result).toEqual([])
  })
})
