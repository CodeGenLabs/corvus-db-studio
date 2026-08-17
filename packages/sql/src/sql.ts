import { formatParameter, quoteIdentifier, type SqlDialect } from './dialect'

export class SqlIdentifier {
  readonly __brand = 'SqlIdentifier' as const
  constructor(readonly name: string) {}
}

export class RawSql {
  readonly __brand = 'RawSql' as const
  constructor(readonly text: string) {}
}

export function ident(name: string): SqlIdentifier {
  return new SqlIdentifier(name)
}

export function raw(text: string): RawSql {
  return new RawSql(text)
}

export interface CompiledQuery {
  text: string
  values: unknown[]
}

export class SqlStatement {
  readonly strings: readonly string[]
  readonly values: readonly unknown[]

  constructor(strings: readonly string[], values: readonly unknown[]) {
    this.strings = strings
    this.values = values
  }

  compile(dialect: SqlDialect = 'postgres'): CompiledQuery {
    let outText = ''
    const outValues: unknown[] = []
    let paramIndex = 0

    const append = (stmt: SqlStatement) => {
      for (let i = 0; i < stmt.strings.length; i++) {
        outText += stmt.strings[i]
        if (i < stmt.values.length) {
          const val = stmt.values[i]
          if (val instanceof SqlIdentifier) {
            outText += quoteIdentifier(val.name, dialect)
          } else if (val instanceof RawSql) {
            outText += val.text
          } else if (val instanceof SqlStatement) {
            append(val)
          } else {
            outText += formatParameter(paramIndex++, dialect)
            outValues.push(val)
          }
        }
      }
    }

    append(this)
    return { text: outText, values: outValues }
  }
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): SqlStatement {
  return new SqlStatement(strings, values)
}
