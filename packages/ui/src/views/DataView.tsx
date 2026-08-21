import { useEffect, useState } from 'react'
import type { CellValue, ColumnDef } from '@corvus/contract'
import { useStudio, useClient } from '../store/studio'
import { DataGrid } from '../components/grid'

export function DataView() {
  const { s, activeTab } = useStudio()
  const client = useClient()

  const tab = activeTab()
  const objIdent = tab?.identity.type === 'object' ? tab.identity : null

  const connectionId = objIdent?.connectionId || 'conn-1'
  const table = objIdent?.name || s.selTable || 'customer'
  const schema = objIdent?.namespace
  const database = objIdent?.database

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [sortColumn, setSortColumn] = useState<string | undefined>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)
  const [loading, setLoading] = useState(false)

  // Dữ liệu hiển thị
  const [columns, setColumns] = useState<ColumnDef[]>([])
  const [rows, setRows] = useState<CellValue[][]>([])
  const [totalRows, setTotalRows] = useState<number>(0)

  // Modal Preview Diff khi sửa dữ liệu
  const [pendingChange, setPendingChange] = useState<{
    sql: string
    previewToken: string
    rowIdx: number
    colIdx: number
    val: CellValue
  } | null>(null)

  // 1. Tải danh sách dòng qua stream data.browse
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const stream = client.stream('data.browse', {
          connectionId,
          database,
          schema,
          table,
          offset: (page - 1) * pageSize,
          limit: pageSize,
          sort: sortColumn && sortDirection ? [{ column: sortColumn, direction: sortDirection }] : undefined,
        })

        let fetchedCols: ColumnDef[] = []
        const fetchedRows: CellValue[][] = []

        for await (const rawChunk of stream) {
          if (cancelled) break
          const chunk = rawChunk as {
            columns?: ColumnDef[]
            rows?: CellValue[][]
          }
          if (chunk.columns && chunk.columns.length > 0) {
            fetchedCols = chunk.columns
          }
          if (chunk.rows) {
            fetchedRows.push(...chunk.rows)
          }
        }

        if (!cancelled) {
          setColumns(fetchedCols)
          setRows(fetchedRows)
        }
      } catch {
        if (!cancelled) {
          setColumns([])
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, database, schema, table, page, pageSize, sortColumn, sortDirection])

  // 2. Tải tổng số dòng qua data.count
  useEffect(() => {
    let cancelled = false
    async function fetchCount() {
      try {
        const res = await client.request<{ count: number; isEstimate: boolean }>('data.count', {
          connectionId,
          database,
          schema,
          table,
        })
        if (!cancelled) {
          setTotalRows(res.count)
        }
      } catch {
        if (!cancelled) {
          setTotalRows(0)
        }
      }
    }
    fetchCount()
    return () => {
      cancelled = true
    }
  }, [client, connectionId, database, schema, table])

  // 3. Xử lý sửa ô dữ liệu (Inline Edit) qua previewChanges
  const handleCellEdit = async (rowIdx: number, colIdx: number, val: CellValue) => {
    const colName = columns[colIdx]?.name
    if (!colName) return

    const currentRow = rows[rowIdx]
    const pkCol = columns[0]?.name || 'id'
    const pkVal = currentRow?.[0]

    try {
      const preview = await client.request<{ sql: string; previewToken: string }>('data.previewChanges', {
        connectionId,
        database,
        schema,
        table,
        updates: [
          {
            keys: { [pkCol]: pkVal && typeof pkVal === 'object' && 'v' in pkVal ? pkVal.v : pkVal },
            changes: { [colName]: val && typeof val === 'object' && 'v' in val ? val.v : val },
          },
        ],
      })

      setPendingChange({
        sql: preview.sql,
        previewToken: preview.previewToken,
        rowIdx,
        colIdx,
        val,
      })
    } catch {
      // Cập nhật optimistic local nếu không gọi được RPC
      const newRows = [...rows]
      if (newRows[rowIdx]) {
        newRows[rowIdx] = [...newRows[rowIdx]]
        newRows[rowIdx][colIdx] = val
        setRows(newRows)
      }
    }
  }

  // 4. Áp dụng thay đổi qua applyChanges
  const handleConfirmApply = async () => {
    if (!pendingChange) return
    try {
      await client.request('data.applyChanges', {
        previewToken: pendingChange.previewToken,
      })
      // Cập nhật UI
      const newRows = [...rows]
      if (newRows[pendingChange.rowIdx]) {
        newRows[pendingChange.rowIdx] = [...newRows[pendingChange.rowIdx]]
        newRows[pendingChange.rowIdx][pendingChange.colIdx] = pendingChange.val
        setRows(newRows)
      }
    } catch (err) {
      alert(`Lỗi áp dụng thay đổi: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setPendingChange(null)
    }
  }

  const handleSortChange = (colName: string, dir: 'asc' | 'desc' | null) => {
    setSortColumn(dir ? colName : undefined)
    setSortDirection(dir)
    setPage(1)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            fontSize: 11,
            color: 'var(--accent)',
            background: 'var(--pane2)',
            padding: '2px 8px',
            borderRadius: 4,
            zIndex: 10,
          }}
        >
          Đang tải dữ liệu...
        </div>
      )}
      <DataGrid
        columns={columns}
        rows={rows}
        totalRows={totalRows || rows.length}
        currentPage={page}
        pageSize={pageSize}
        tableName={table}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onCellEdit={handleCellEdit}
      />

      {/* Modal Preview Changes */}
      {pendingChange && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: 520,
              background: 'var(--pane)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)' }}>
              Xác nhận thay đổi dữ liệu (Preview SQL)
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--text2)' }}>
              Câu lệnh SQL sau sẽ được thực thi trên database:
            </p>
            <pre
              style={{
                background: 'var(--pane2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 10,
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                color: 'var(--text)',
                lineHeight: 1.5,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {pendingChange.sql}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setPendingChange(null)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11.5,
                }}
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleConfirmApply}
                style={{
                  padding: '5px 14px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11.5,
                }}
              >
                Áp dụng thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
