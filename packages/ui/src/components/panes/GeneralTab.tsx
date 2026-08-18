export interface GeneralTabProps {
  objectName: string
  objectType: 'table' | 'view' | 'routine' | 'trigger'
  database?: string
  schema?: string
  rowCount?: number
  dataSize?: string
  indexSize?: string
  createdAt?: string
  updatedAt?: string
  comment?: string
  engine?: string
  collation?: string
}

export function GeneralTab({
  objectName,
  objectType,
  database,
  schema,
  rowCount,
  dataSize,
  indexSize,
  createdAt,
  updatedAt,
  comment,
  engine,
  collation,
}: GeneralTabProps) {
  return (
    <div style={{ padding: 12, fontSize: 11, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        📌 Thông tin chung: {objectName}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 6, columnGap: 8 }}>
        <span style={{ color: 'var(--text3)' }}>Loại đối tượng:</span>
        <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{objectType}</span>

        {database && (
          <>
            <span style={{ color: 'var(--text3)' }}>Database:</span>
            <span>{database}</span>
          </>
        )}

        {schema && (
          <>
            <span style={{ color: 'var(--text3)' }}>Schema:</span>
            <span>{schema}</span>
          </>
        )}

        {engine && (
          <>
            <span style={{ color: 'var(--text3)' }}>Engine:</span>
            <span>{engine}</span>
          </>
        )}

        {collation && (
          <>
            <span style={{ color: 'var(--text3)' }}>Collation:</span>
            <span>{collation}</span>
          </>
        )}

        {rowCount !== undefined && (
          <>
            <span style={{ color: 'var(--text3)' }}>Số dòng (ước tính):</span>
            <span style={{ fontWeight: 600 }}>{rowCount.toLocaleString()}</span>
          </>
        )}

        {dataSize && (
          <>
            <span style={{ color: 'var(--text3)' }}>Dung lượng dữ liệu:</span>
            <span>{dataSize}</span>
          </>
        )}

        {indexSize && (
          <>
            <span style={{ color: 'var(--text3)' }}>Dung lượng index:</span>
            <span>{indexSize}</span>
          </>
        )}

        {createdAt && (
          <>
            <span style={{ color: 'var(--text3)' }}>Ngày tạo:</span>
            <span>{createdAt}</span>
          </>
        )}

        {updatedAt && (
          <>
            <span style={{ color: 'var(--text3)' }}>Cập nhật lần cuối:</span>
            <span>{updatedAt}</span>
          </>
        )}

        {comment && (
          <>
            <span style={{ color: 'var(--text3)' }}>Ghi chú (Comment):</span>
            <span style={{ fontStyle: 'italic', color: 'var(--text2)' }}>{comment}</span>
          </>
        )}
      </div>
    </div>
  )
}
