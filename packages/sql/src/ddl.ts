import type { DdlWarning, FieldDesign, TableDesign } from '@corvus/contract'
import type { SqlDialect } from './dialect'

function quoteIdent(name: string, dialect: SqlDialect): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/g, '``')}\``
  return `"${name.replace(/"/g, '""')}"`
}

export function generateCreateTable(
  design: TableDesign,
  dialect: SqlDialect = 'postgres',
): { statements: string[]; warnings: DdlWarning[] } {
  const warnings: DdlWarning[] = []
  const quotedTable = quoteIdent(design.name, dialect)

  const fieldDefs: string[] = design.fields.map((f) => {
    const quotedCol = quoteIdent(f.name, dialect)
    let typeStr = f.type.toUpperCase()
    if (f.length) {
      typeStr += `(${f.length})`
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
    const pkCols = pkFields.map((f) => quoteIdent(f.name, dialect)).join(', ')
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
    createSql += ` ENGINE=${design.engine}`
  }
  createSql += ';'

  return {
    statements: [createSql],
    warnings,
  }
}

export function generateAlterTable(
  before: TableDesign,
  after: TableDesign,
  dialect: SqlDialect = 'postgres',
): { statements: string[]; warnings: DdlWarning[] } {
  const statements: string[] = []
  const warnings: DdlWarning[] = []
  const quotedTable = quoteIdent(before.name, dialect)

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

    const commonCols = before.fields
      .filter((bf) => after.fields.some((af) => af.id === bf.id))
      .map((f) => quoteIdent(f.name, 'sqlite'))
      .join(', ')

    if (commonCols) {
      statements.push(
        `INSERT INTO ${quoteIdent(tempTable, 'sqlite')} (${commonCols}) SELECT ${commonCols} FROM ${quotedTable};`,
      )
    }

    statements.push(`DROP TABLE ${quotedTable};`)
    statements.push(
      `ALTER TABLE ${quoteIdent(tempTable, 'sqlite')} RENAME TO ${quoteIdent(after.name, 'sqlite')};`,
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
      statements.push(
        `ALTER TABLE ${quotedTable} DROP COLUMN ${quoteIdent(bf.name, dialect)};`,
      )
    }
  }

  // Check added columns
  for (const [id, af] of afterMap.entries()) {
    if (!beforeMap.has(id)) {
      let typeStr = af.type.toUpperCase()
      if (af.length) typeStr += `(${af.length})`
      let def = `${quoteIdent(af.name, dialect)} ${typeStr}`
      if (!af.nullable) def += ' NOT NULL'
      statements.push(`ALTER TABLE ${quotedTable} ADD COLUMN ${def};`)
    }
  }

  // Check modified columns (rename / type change)
  for (const [id, af] of afterMap.entries()) {
    const bf = beforeMap.get(id)
    if (bf) {
      if (bf.name !== af.name) {
        if (dialect === 'postgres') {
          statements.push(
            `ALTER TABLE ${quotedTable} RENAME COLUMN ${quoteIdent(bf.name, dialect)} TO ${quoteIdent(af.name, dialect)};`,
          )
        } else if (dialect === 'mysql') {
          let typeStr = af.type.toUpperCase()
          if (af.length) typeStr += `(${af.length})`
          statements.push(
            `ALTER TABLE ${quotedTable} CHANGE COLUMN ${quoteIdent(bf.name, dialect)} ${quoteIdent(af.name, dialect)} ${typeStr};`,
          )
        }
      }
    }
  }

  return { statements, warnings }
}

export function generateDropTable(name: string, dialect: SqlDialect = 'postgres'): string {
  return `DROP TABLE ${quoteIdent(name, dialect)};`
}
