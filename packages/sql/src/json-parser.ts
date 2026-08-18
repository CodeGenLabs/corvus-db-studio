import type { ColumnDef, CellValue } from '@corvus/contract'
import { inferColumnType } from './import-parser'

export interface ParsedJsonTable {
  columns: ColumnDef[]
  rows: CellValue[][]
  totalRecords: number
}

/**
 * Parses a JSON string (either an array of objects or an object containing an array) into structured tabular data
 */
export function parseJsonToTable(jsonContent: string): ParsedJsonTable {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonContent)
  } catch (err: any) {
    throw new Error(`Cú pháp JSON không hợp lệ: ${err.message}`)
  }

  let items: Record<string, unknown>[] = []

  if (Array.isArray(parsed)) {
    items = parsed.filter((item) => typeof item === 'object' && item !== null)
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Look for first array property
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) {
        items = val.filter((item) => typeof item === 'object' && item !== null)
        break
      }
    }
  }

  if (items.length === 0) {
    return { columns: [], rows: [], totalRecords: 0 }
  }

  // Extract all unique property keys
  const colMap = new Map<string, string[]>()
  items.forEach((item) => {
    Object.entries(item).forEach(([k, v]) => {
      if (!colMap.has(k)) {
        colMap.set(k, [])
      }
      colMap.get(k)!.push(v === null || v === undefined ? '' : String(v))
    })
  })

  const colNames = Array.from(colMap.keys())
  const columns: ColumnDef[] = colNames.map((name) => ({
    name,
    type: inferColumnType(colMap.get(name) || []),
    nullable: true,
  }))

  const rows: CellValue[][] = items.map((item) =>
    colNames.map((col) => {
      const val = item[col]
      if (val === null || val === undefined) {
        return { k: 'null' }
      }
      if (typeof val === 'number') {
        return { k: 'num', v: val }
      }
      if (typeof val === 'boolean') {
        return { k: 'bool', v: val }
      }
      if (typeof val === 'object') {
        return { k: 'json', v: JSON.stringify(val) }
      }
      return { k: 'str', v: String(val) }
    }),
  )

  return {
    columns,
    rows,
    totalRecords: items.length,
  }
}
