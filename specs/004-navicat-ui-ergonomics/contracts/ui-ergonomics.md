# Contract Specification: UI Ergonomics & Connection Colorings

Tài liệu này xác định các mở rộng giao diện lập trình hợp đồng RPC (isomorphic contract trong `@corvus/contract`) phục vụ 5 gói UI/UX Navicat.

---

## 1. Mở rộng `ConnectionProfile` (Trường `color`)

Trong `packages/contract/src/methods/connection.ts`:

```ts
export const ConnectionColorSchema = z.enum([
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'gray',
])

export type ConnectionColor = z.infer<typeof ConnectionColorSchema>

export const ConnectionProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  driverId: z.string(),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  user: z.string().optional(),
  color: ConnectionColorSchema.optional(), // Nhãn màu trực quan
  // ... các trường kết nối khác
})
```

---

## 2. Giao thức Lọc & Sắp xếp dữ liệu (`data.browse`)

Trong `packages/contract/src/methods/data.ts`:

```ts
export const FilterRuleSchema = z.object({
  field: z.string(),
  operator: z.enum([
    '=',
    '!=',
    '<',
    '<=',
    '>',
    '>=',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'is_null',
    'is_not_null',
    'between',
  ]),
  value: z.string(),
  value2: z.string().optional(),
  logic: z.enum(['AND', 'OR']).default('AND'),
})

export const SortRuleSchema = z.object({
  field: z.string(),
  direction: z.enum(['ASC', 'DESC']),
})

export const DataBrowseParamsSchema = z.object({
  connectionId: z.string(),
  table: z.string(),
  schema: z.string().optional(),
  limit: z.number().default(100),
  offset: z.number().default(0),
  filterRules: z.array(FilterRuleSchema).optional(),
  sortRules: z.array(SortRuleSchema).optional(),
})
```

---

## 3. Quy trình Preview Token cho Table Designer DDL

Mọi thao tác lưu bảng trong `DesignView.tsx` tuân thủ nghiêm ngặt giao thức 2 bước:
1. `ddl.previewTable`: Nhận cấu trúc mong muốn $\rightarrow$ Engine sinh câu lệnh `ALTER TABLE` / `CREATE TABLE` và trả về `previewToken` + `sql`.
2. `ddl.applyTable`: Người dùng xác nhận $\rightarrow$ Gửi `previewToken` để áp dụng vào server database.
