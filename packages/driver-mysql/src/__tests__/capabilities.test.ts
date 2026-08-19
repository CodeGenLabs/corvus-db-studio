import { describe, expect, it } from 'vitest'
import { narrowMysqlCapabilities, parseMysqlVersion } from '../capabilities'

describe('MySQL Capabilities and Version Parsing', () => {
  it('parse phiên bản MySQL và MariaDB chính xác', () => {
    const v1 = parseMysqlVersion('8.0.36')
    expect(v1.major).toBe(8)
    expect(v1.minor).toBe(0)
    expect(v1.patch).toBe(36)
    expect(v1.isMariaDb).toBe(false)

    const v2 = parseMysqlVersion('10.5.23-MariaDB', 'mariadb.org binary distribution')
    expect(v2.major).toBe(10)
    expect(v2.minor).toBe(5)
    expect(v2.patch).toBe(23)
    expect(v2.isMariaDb).toBe(true)

    const v3 = parseMysqlVersion('5.7.44-0ubuntu0.18.04.1')
    expect(v3.major).toBe(5)
    expect(v3.minor).toBe(7)
    expect(v3.patch).toBe(44)
    expect(v3.isMariaDb).toBe(false)
  })

  it('thu hẹp capability cho MySQL 5.7 (không có CTE, Window, Roles, Explain Analyze)', () => {
    const v57 = parseMysqlVersion('5.7.44')
    const caps = narrowMysqlCapabilities({
      version: v57,
      isMariaDb: false,
      lowerCaseTableNames: 0,
      sqlMode: 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES',
    })

    expect(caps.sql.cte).toBe(false)
    expect(caps.sql.windowFunctions).toBe(false)
    expect(caps.sql.returning).toBe(false)
    expect(caps.exec.explainAnalyze).toBe(false)
    expect(caps.tools.roleManagement).toBe(false)
    expect(caps.sql.caseSensitivity).toBe('platform')
    expect(caps.sql.identifierQuote).toBe('`')
  })

  it('mở rộng capability cho MySQL 8.0 (có CTE, Window, Roles) và 8.0.18+ (có Explain Analyze)', () => {
    const v80 = parseMysqlVersion('8.0.36')
    const caps80 = narrowMysqlCapabilities({
      version: v80,
      isMariaDb: false,
      lowerCaseTableNames: 1,
      sqlMode: '',
    })

    expect(caps80.sql.cte).toBe(true)
    expect(caps80.sql.windowFunctions).toBe(true)
    expect(caps80.sql.returning).toBe(false) // MySQL không có RETURNING
    expect(caps80.exec.explainAnalyze).toBe(true)
    expect(caps80.tools.roleManagement).toBe(true)
    expect(caps80.sql.caseSensitivity).toBe('lower')
    expect(caps80.sql.identifierQuote).toBe('`')

    const v804 = parseMysqlVersion('8.0.4')
    const caps804 = narrowMysqlCapabilities({
      version: v804,
      isMariaDb: false,
    })
    expect(caps804.exec.explainAnalyze).toBe(false) // Chỉ từ 8.0.18
  })

  it('mở rộng RETURNING riêng cho MariaDB ≥ 10.5', () => {
    const vMaria105 = parseMysqlVersion('10.5.23-MariaDB')
    const caps105 = narrowMysqlCapabilities({
      version: vMaria105,
      isMariaDb: true,
    })
    expect(caps105.sql.returning).toBe(true)
    expect(caps105.sql.cte).toBe(true)
    expect(caps105.sql.windowFunctions).toBe(true)
    expect(caps105.tools.roleManagement).toBe(true)

    const vMaria101 = parseMysqlVersion('10.1.48-MariaDB')
    const caps101 = narrowMysqlCapabilities({
      version: vMaria101,
      isMariaDb: true,
    })
    expect(caps101.sql.returning).toBe(false)
    expect(caps101.sql.cte).toBe(false)
  })

  it('thay đổi identifierQuote khi sql_mode chứa ANSI_QUOTES (BẪY 4)', () => {
    const v8 = parseMysqlVersion('8.0.36')
    const capsAnsi = narrowMysqlCapabilities({
      version: v8,
      isMariaDb: false,
      sqlMode: 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE',
    })
    expect(capsAnsi.sql.identifierQuote).toBe('"')
  })
})
