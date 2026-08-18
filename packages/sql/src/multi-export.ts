export type MultiExportMode = 'single_file' | 'separate_files' | 'multi_sheet'

export interface MultiExportTarget {
  name: string
  type: 'table' | 'view'
  schema?: string
  columns: string[]
  rows: Record<string, any>[]
}

export interface MultiExportPlan {
  mode: MultiExportMode
  format: 'sql' | 'csv' | 'json' | 'xlsx'
  targets: MultiExportTarget[]
}

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
      parts.push(`-- =============================================`)
      parts.push(`-- Target: ${target.schema ? `${target.schema}.` : ''}${target.name}`)
      parts.push(`-- Records: ${target.rows.length}`)
      parts.push(`-- =============================================\n`)

      for (const row of target.rows) {
        const cols = Object.keys(row).map((c) => `"${c}"`).join(', ')
        const vals = Object.values(row)
          .map((v) => (v === null ? 'NULL' : typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`))
          .join(', ')
        parts.push(`INSERT INTO "${target.name}" (${cols}) VALUES (${vals});`)
      }
      parts.push('\n')
    }
    return parts.join('\n')
  }
}
