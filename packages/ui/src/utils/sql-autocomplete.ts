export interface CompletionItem {
  label: string
  type: 'keyword' | 'table' | 'column' | 'function'
  info?: string
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'GROUP BY', 'HAVING',
  'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'AS', 'IN',
  'BETWEEN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL', 'AND', 'OR', 'NOT', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'EXISTS', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'PRIMARY KEY',
]

const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NOW', 'DATE', 'CONCAT', 'LOWER', 'UPPER',
  'SUBSTRING', 'TRIM', 'LENGTH', 'ROUND', 'CAST',
]

export class SqlAutocompleteService {
  private tableCache: Map<string, string[]> = new Map()
  private columnCache: Map<string, string[]> = new Map()

  public setSchemaCache(tables: string[], columnsByTable: Record<string, string[]>): void {
    this.tableCache.set('tables', tables)
    Object.entries(columnsByTable).forEach(([tbl, cols]) => {
      this.columnCache.set(tbl, cols)
    })
  }

  public getCompletions(prefix: string, currentTable?: string): CompletionItem[] {
    const p = prefix.toUpperCase()
    const results: CompletionItem[] = []

    // 1. Keywords
    SQL_KEYWORDS.filter((kw) => kw.startsWith(p)).forEach((kw) => {
      results.push({ label: kw, type: 'keyword' })
    })

    // 2. Functions
    SQL_FUNCTIONS.filter((fn) => fn.startsWith(p)).forEach((fn) => {
      results.push({ label: `${fn}()`, type: 'function', info: 'Hàm SQL' })
    })

    // 3. Tables
    const tables = this.tableCache.get('tables') || []
    tables.filter((t) => t.toLowerCase().includes(prefix.toLowerCase())).forEach((t) => {
      results.push({ label: t, type: 'table', info: 'Bảng' })
    })

    // 4. Columns (if table is known or from all tables)
    if (currentTable && this.columnCache.has(currentTable)) {
      const cols = this.columnCache.get(currentTable) || []
      cols.filter((c) => c.toLowerCase().includes(prefix.toLowerCase())).forEach((c) => {
        results.push({ label: c, type: 'column', info: `Cột (${currentTable})` })
      })
    }

    return results
  }
}
