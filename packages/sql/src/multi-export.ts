import { quoteIdentifier, quoteLiteral } from './dialect'

export type MultiExportMode = 'single_file' | 'separate_files' | 'multi_sheet'

export interface MultiExportTarget {
  name: string
  type: 'table' | 'view'
  schema?: string
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface MultiExportPlan {
  mode: MultiExportMode
  format: 'sql' | 'csv' | 'json' | 'xlsx'
  targets: MultiExportTarget[]
}

/**
 * Manages export plans and generates merged SQL export scripts.
 *
 * NOTE: Category (b) - Export file generation. All identifiers use quoteIdentifier()
 * and literal values use quoteLiteral().
 */
export class MultiExportManager {
  public static planExport(
    targets: MultiExportTarget[],
    format: 'sql' | 'csv' | 'json' | 'xlsx',
    mode: MultiExportMode,
  ): MultiExportPlan {
    return {
      mode,
      format,
      targets,
    }
  }

  public static generateMergedSql(targets: MultiExportTarget[]): string {
    const parts: string[] = []
    for (const target of targets) {
      const quotedTable = target.schema
        ? `${quoteIdentifier(target.schema, 'postgres')}.${quoteIdentifier(target.name, 'postgres')}`
        : quoteIdentifier(target.name, 'postgres')

      parts.push(`-- =============================================`)
      parts.push(`-- Target: ${target.schema ? `${target.schema}.` : ''}${target.name}`)
      parts.push(`-- Records: ${target.rows.length}`)
      parts.push(`-- =============================================\n`)

      for (const row of target.rows) {
        const quotedCols = Object.keys(row).map((c) => quoteIdentifier(c, 'postgres')).join(', ')
        const quotedVals = Object.values(row)
          .map((v) => {
            if (v === null || v === undefined) return 'NULL'
            if (typeof v === 'number' || typeof v === 'bigint') return String(v)
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
            return quoteLiteral(String(v), 'postgres')
          })
          .join(', ')
        parts.push(`INSERT INTO ${quotedTable} (${quotedCols}) VALUES (${quotedVals});`)
      }
      parts.push('\n')
    }
    return parts.join('\n')
  }
}
