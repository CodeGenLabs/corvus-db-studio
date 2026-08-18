export interface XlsxSheetData {
  sheetName: string
  headers: string[]
  rows: (string | number | boolean | null)[][]
}

export class XlsxTableParser {
  /**
   * Parses raw tabular array into typed columns and rows for spreadsheet import
   */
  public static parseSheetMatrix(
    sheetName: string,
    matrix: (string | number | boolean | null)[][],
    hasHeaderRow = true,
  ): XlsxSheetData {
    if (!matrix || matrix.length === 0) {
      return { sheetName, headers: [], rows: [] }
    }

    let headers: string[] = []
    let rows: (string | number | boolean | null)[][] = []

    if (hasHeaderRow) {
      headers = (matrix[0] || []).map((cell, idx) => (cell ? String(cell).trim() : `Col_${idx + 1}`))
      rows = matrix.slice(1)
    } else {
      const colCount = Math.max(...matrix.map((r) => r.length))
      headers = Array.from({ length: colCount }, (_, i) => `Col_${i + 1}`)
      rows = matrix
    }

    return {
      sheetName,
      headers,
      rows,
    }
  }
}
