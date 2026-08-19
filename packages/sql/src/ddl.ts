import type { DdlWarning, FieldDesign, TableDesign } from '@corvus/contract'
import type { SqlDialect } from './dialect'
import { quoteIdentifier, sqlKeyword } from './dialect'

/**
 * Generates CREATE TABLE DDL.
 *
 * NOTE: Category (b) - DDL generation for user preview, schema sync, and .sql export.
 * Cannot use bind parameters in DDL statements. All table and column names are quoted
 * with quoteIdentifier().
 */
export function generateCreateTable(
  design: TableDesign,
  dialect: SqlDialect = 'postgres',
): { statements: string[]; warnings: DdlWarning[] } {
  const warnings: DdlWarning[] = []
  const quotedTable = quoteIdentifier(design.name, dialect)

  const fieldDefs: string[] = design.fields.map((f) => {
    const quotedCol = quoteIdentifier(f.name, dialect)
    let typeStr = f.type.toUpperCase()
    if (f.length) {
      typeStr += `(${Number(f.length)})`
    }
    let def = `${quotedCol} ${typeStr}`
    if (f.autoIncrement) {
      if (dialect === 'mysql') def += ' AUTO_INCREMENT'
      else if (dialect === 'postgres') def = `${quotedCol} SERIAL`
    }
    if (!f.nullable) {
      def += ' NOT NULL'
    }
    if (f.defaultValue !== undefined && f.defaultValue !== '') {
      def += ` DEFAULT ${f.defaultValue}`
    }
    return def
  })

  const pkFields = design.fields.filter((f) => f.isPrimaryKey)
  if (pkFields.length > 0) {
    const pkCols = pkFields.map((f) => quoteIdentifier(f.name, dialect)).join(', ')
    fieldDefs.push(`PRIMARY KEY (${pkCols})`)
  } else {
    warnings.push({
      level: 'warning',
      code: 'NO_PRIMARY_KEY',
      message: 'Bảng không có khoá chính. Một số tính năng chỉnh sửa dữ liệu có thể bị hạn chế.',
    })
  }

  let createSql = `CREATE TABLE ${quotedTable} (\n  ${fieldDefs.join(',\n  ')}\n)`
  if (dialect === 'mysql' && design.engine) {
    const safeEngine = sqlKeyword(
      design.engine.toUpperCase(),
      ['INNODB', 'MYISAM', 'MEMORY', 'CSV', 'ARCHIVE'] as const,
      'INNODB',
    )
    createSql += ` ENGINE=${safeEngine}`
  }
  createSql += ';'

  return {
    statements: [createSql],
    warnings,
  }
}

/**
 * Generates ALTER TABLE DDL diff.
 *
 * NOTE: Category (b) - DDL preview for schema mutations.
 * Identifiers are safely escaped via quoteIdentifier().
 */
export function generateAlterTable(
  before: TableDesign,
  after: TableDesign,
  dialect: SqlDialect = 'postgres',
): { statements: string[]; warnings: DdlWarning[] } {
  const statements: string[] = []
  const warnings: DdlWarning[] = []
  const quotedTable = quoteIdentifier(before.name, dialect)

  // SQLite special case: recreate table
  if (dialect === 'sqlite') {
    warnings.push({
      level: 'info',
      code: 'SQLITE_REBUILD',
      message: 'SQLite không hỗ trợ ALTER TABLE đầy đủ. Hệ thống sẽ tạo bảng tạm và sao chép dữ liệu.',
    })

    const tempTable = `__temp_${before.name}_${Date.now()}`
    const tempDesign = { ...after, name: tempTable }
    const createTemp = generateCreateTable(tempDesign, 'sqlite')

    statements.push(...createTemp.statements)

    const quotedCommonCols = before.fields
      .filter((bf) => after.fields.some((af) => af.id === bf.id))
      .map((f) => quoteIdentifier(f.name, 'sqlite'))
      .join(', ')

    const quotedTempTable = quoteIdentifier(tempTable, 'sqlite')
    const quotedAfterTable = quoteIdentifier(after.name, 'sqlite')

    if (quotedCommonCols) {
      statements.push(
        `INSERT INTO ${quotedTempTable} (${quotedCommonCols}) SELECT ${quotedCommonCols} FROM ${quotedTable};`,
      )
    }

    statements.push(`DROP TABLE ${quotedTable};`)
    statements.push(
      `ALTER TABLE ${quotedTempTable} RENAME TO ${quotedAfterTable};`,
    )

    return { statements, warnings }
  }

  // 1. Detect renames & column modifications
  const beforeMap = new Map<string, FieldDesign>(before.fields.map((f) => [f.id, f]))
  const afterMap = new Map<string, FieldDesign>(after.fields.map((f) => [f.id, f]))

  // Check deleted columns
  for (const [id, bf] of beforeMap.entries()) {
    if (!afterMap.has(id)) {
      warnings.push({
        level: 'danger',
        code: 'DROP_COLUMN_DATA_LOSS',
        message: `Xoá cột "${bf.name}" sẽ làm mất toàn bộ dữ liệu trong cột này.`,
      })
      const quotedColName = quoteIdentifier(bf.name, dialect)
      statements.push(
        `ALTER TABLE ${quotedTable} DROP COLUMN ${quotedColName};`,
      )
    }
  }

  // Check added columns
  for (const [id, af] of afterMap.entries()) {
    if (!beforeMap.has(id)) {
      let safeTypeStr = af.type.toUpperCase()
      if (af.length) safeTypeStr += `(${Number(af.length)})`
      const quotedColName = quoteIdentifier(af.name, dialect)
      let safeDef = `${quotedColName} ${safeTypeStr}`
      if (!af.nullable) safeDef += ' NOT NULL'
      statements.push(`ALTER TABLE ${quotedTable} ADD COLUMN ${safeDef};`)
    }
  }

  // Check modified columns (rename / type change)
  for (const [id, af] of afterMap.entries()) {
    const bf = beforeMap.get(id)
    if (bf) {
      if (bf.name !== af.name) {
        const quotedOldName = quoteIdentifier(bf.name, dialect)
        const quotedNewName = quoteIdentifier(af.name, dialect)
        if (dialect === 'postgres') {
          statements.push(
            `ALTER TABLE ${quotedTable} RENAME COLUMN ${quotedOldName} TO ${quotedNewName};`,
          )
        } else if (dialect === 'mysql') {
          let safeTypeStr = af.type.toUpperCase()
          if (af.length) safeTypeStr += `(${Number(af.length)})`
          statements.push(
            `ALTER TABLE ${quotedTable} CHANGE COLUMN ${quotedOldName} ${quotedNewName} ${safeTypeStr};`,
          )
        }
      }
    }
  }

  return { statements, warnings }
}

export function generateDropTable(name: string, dialect: SqlDialect = 'postgres'): string {
  const quotedTable = quoteIdentifier(name, dialect)
  return `DROP TABLE ${quotedTable};`
}
