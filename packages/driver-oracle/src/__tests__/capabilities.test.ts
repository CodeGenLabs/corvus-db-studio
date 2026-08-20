import { describe, expect, it } from 'vitest'
import { ORACLE_CAPABILITIES, narrowOracleCapabilities } from '../capabilities'

describe('Oracle Capabilities', () => {
  it('khai báo phân tầng 2 cấp (hasCatalogs: false, hasSchemas: true)', () => {
    expect(ORACLE_CAPABILITIES.hierarchy.hasCatalogs).toBe(false)
    expect(ORACLE_CAPABILITIES.hierarchy.hasSchemas).toBe(true)
  })

  it('hỗ trợ các loại đối tượng của Oracle gồm package và materializedView', () => {
    expect(ORACLE_CAPABILITIES.objects.table).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.view).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.materializedView).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.procedure).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.function).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.package).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.trigger).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.sequence).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.index).toBe(true)
    expect(ORACLE_CAPABILITIES.objects.type).toBe(true)
  })

  it('narrowOracleCapabilities chuyển sang rownum cho Oracle 11g (< 12.1)', () => {
    const modern = narrowOracleCapabilities('Oracle Database 19c Enterprise Edition Release 19.0.0.0.0')
    expect(modern.sql.limitSyntax).toBe('offset-fetch')

    const legacy = narrowOracleCapabilities('Oracle Database 11g Enterprise Edition Release 11.2.0.4.0')
    expect(legacy.sql.limitSyntax).toBe('rownum')
  })
})
