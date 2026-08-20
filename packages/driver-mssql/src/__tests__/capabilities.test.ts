import { describe, expect, it } from 'vitest'
import { MSSQL_CAPABILITIES, narrowMssqlCapabilities } from '../capabilities'

describe('MSSQL Capabilities (T064)', () => {
  it('khai báo đầy đủ 3 cấp phân tầng (hasCatalogs: true, hasSchemas: true)', () => {
    expect(MSSQL_CAPABILITIES.hierarchy.hasCatalogs).toBe(true)
    expect(MSSQL_CAPABILITIES.hierarchy.hasSchemas).toBe(true)
  })

  it('hỗ trợ các loại đối tượng chuẩn của SQL Server', () => {
    expect(MSSQL_CAPABILITIES.objects.table).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.view).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.procedure).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.function).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.trigger).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.sequence).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.index).toBe(true)
    expect(MSSQL_CAPABILITIES.objects.type).toBe(true)

    // Không hỗ trợ
    expect(MSSQL_CAPABILITIES.objects.domain).toBe(false)
    expect(MSSQL_CAPABILITIES.objects.package).toBe(false)
    expect(MSSQL_CAPABILITIES.objects.event).toBe(false)
  })

  it('narrowMssqlCapabilities thu hẹp tính năng với SQL Server cũ (< 11.0)', () => {
    const modern = narrowMssqlCapabilities('Microsoft SQL Server 2019 (RTM) - 15.0.2000.5')
    expect(modern.objects.sequence).toBe(true)
    expect(modern.sql.limitSyntax).toBe('offset-fetch')

    const legacy = narrowMssqlCapabilities('Microsoft SQL Server 2008 R2 - 10.50.1600.1')
    expect(legacy.objects.sequence).toBe(false)
  })
})
