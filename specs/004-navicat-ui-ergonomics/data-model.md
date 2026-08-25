# Data Model: 004-navicat-ui-ergonomics

Tài liệu này định nghĩa các thực thể dữ liệu, cấu trúc trạng thái giao diện và Zod schema cho 5 gói nâng cấp trải nghiệm UI/UX.

---

## 1. Thực thể Lưới dữ liệu (DataGrid Navigation & Filter State)

### 1.1 `DataGridBottomBarState`
```ts
export interface DataGridBottomBarState {
  selectedRowIndex: number | null
  totalRecords: number
  currentPage: number
  totalPages: number
  pageSize: number // 100, 200, 500, 1000, 0 (All)
  isDirty: boolean
  isLoading: boolean
}
```

### 1.2 `FilterCondition` & `SortRule`
```ts
export type FilterOperator =
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'between'

export interface FilterCondition {
  id: string
  enabled: boolean
  field: string
  operator: FilterOperator
  value: string
  value2?: string // dùng cho 'between'
  logic: 'AND' | 'OR'
}

export interface SortRule {
  field: string
  direction: 'ASC' | 'DESC'
}

export interface TableFilterState {
  conditions: FilterCondition[]
  sorts: SortRule[]
  isActive: boolean
}
```

---

## 2. Thực thể Trình thiết kế bảng (Table Designer State)

```ts
export interface DesignerColumn {
  id: string
  name: string
  dataType: string
  length?: number | string
  decimals?: number
  allowNull: boolean
  isPrimaryKey: boolean
  autoIncrement: boolean
  defaultValue?: string
  comment?: string
}

export interface DesignerIndex {
  id: string
  name: string
  fields: string[]
  type: 'NORMAL' | 'UNIQUE' | 'FULLTEXT'
  algorithm: 'BTREE' | 'HASH'
  comment?: string
}

export interface DesignerForeignKey {
  id: string
  name: string
  field: string
  refSchema?: string
  refTable: string
  refField: string
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

export interface TableDesignerState {
  tableName: string
  schema?: string
  engine?: string
  charset?: string
  collation?: string
  comment?: string
  activeTab: 'fields' | 'indexes' | 'foreignKeys' | 'preview'
  columns: DesignerColumn[]
  indexes: DesignerIndex[]
  foreignKeys: DesignerForeignKey[]
  isDirty: boolean
}
```

---

## 3. Thực thể Ghim tab kết quả & Layout (Query Results & Layout State)

```ts
export interface QueryResultTab {
  id: string
  name: string
  isPinned: boolean
  executedAt: number
  durationMs: number
  sql: string
  resultData?: {
    columns: string[]
    rows: unknown[][]
    affectedRows?: number
  }
}

export type SqlViewLayoutMode = 'bottom' | 'right'
```

---

## 4. Thực thể Màu kết nối & Tìm kiếm CSDL (Connection Color & Search)

### 4.1 `ConnectionColor`
```ts
export type ConnectionColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'gray'

// Mở rộng ConnectionProfile trong @corvus/contract
export interface ConnectionProfileWithColor {
  id: string
  name: string
  driverId: string
  host?: string
  port?: number
  database?: string
  user?: string
  color?: ConnectionColor
}
```

### 4.2 `FindInDatabaseQuery` & `SearchResultItem`
```ts
export interface FindInDatabaseParams {
  connectionId: string
  database?: string
  tables: string[]
  searchQuery: string
  mode: 'contains' | 'exact' | 'regex'
  caseSensitive: boolean
  limit: number
}

export interface SearchResultItem {
  tableName: string
  columnName: string
  rowKey: string | number
  matchedValue: string
  snippet: string
}
```
