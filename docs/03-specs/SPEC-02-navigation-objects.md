# SPEC-02: Điều hướng & danh sách đối tượng

- **Trạng thái**: Ready
- **Wave**: W-0
- **Tier**: T0
- **Phụ thuộc**: SPEC-01, ADR-0003, ADR-0007
- **Task**: T-085 … T-098

---

## 1. Mục tiêu

Người dùng duyệt cấu trúc máy chủ (connection → database → schema → nhóm object → object) và
xem danh sách đối tượng kèm thuộc tính, để chọn thứ cần làm việc.

## 2. Phạm vi

**Trong phạm vi**: cây điều hướng, lazy load, danh sách object (List/Detail), Information Pane
(General/DDL/Dependencies/Identifiers), tìm kiếm lọc, virtual group, cache metadata,
vô hiệu hoá cache sau DDL.

**Ngoài phạm vi**: ER Diagram view → SPEC-07. Sửa cấu trúc → SPEC-06.

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-02.01 | Cây MUST hiển thị connection ở cấp 0; mở rộng theo capability (`hasCatalogs`, `hasSchemas`) | MUST |
| FR-02.02 | Cây MUST nạp con **lazy** — chỉ khi node được mở lần đầu | MUST |
| FR-02.03 | Nhóm object trong cây MUST chỉ hiện những loại engine hỗ trợ (`caps.objects.*`) | MUST |
| FR-02.04 | Node đang nạp MUST hiện chỉ báo loading; nạp lỗi MUST hiện icon lỗi + tooltip, không làm sập cây | MUST |
| FR-02.05 | Nhấp đúp bảng MUST mở tab dữ liệu; nhấp đúp folder MUST mở rộng | MUST |
| FR-02.06 | `F5` trên node MUST làm mới node đó (bỏ cache) | MUST |
| FR-02.07 | Gõ chữ vào cây MUST lọc theo tên; node cha chứa kết quả tự mở rộng | MUST |
| FR-02.08 | Objects tab MUST có List view (chỉ tên) và Detail view (nhiều cột thuộc tính) | MUST |
| FR-02.09 | Detail view MUST cho chọn cột hiển thị; lựa chọn lưu theo (engine, loại object) | SHOULD |
| FR-02.10 | Cột `Rows` MUST dùng `estimateRowCount` (rẻ), KHÔNG dùng `COUNT(*)` | MUST |
| FR-02.11 | Objects tab MUST xử lý được schema có 5 000 object mà không treo (ảo hoá) | MUST |
| FR-02.12 | Information Pane tab General MUST hiện thuộc tính object đã chọn | MUST |
| FR-02.13 | Information Pane tab DDL MUST hiện DDL do engine sinh, có tô màu cú pháp và `Ctrl+F` | MUST |
| FR-02.14 | Information Pane tab Dependencies MUST hiện Using / Used By nếu `caps` cho phép | SHOULD |
| FR-02.15 | Người dùng SHOULD gom object vào virtual group; group lưu trong workspace | SHOULD |
| FR-02.16 | Sau bất kỳ DDL nào, cache metadata của schema liên quan MUST bị vô hiệu hoá và cây tự làm mới | MUST |
| FR-02.17 | Metadata SHOULD được cache trên đĩa để mở lại app nhanh; cache có TTL và version | SHOULD |
| FR-02.18 | Người dùng MUST sao chép được tên object đủ điều kiện (`"schema"."table"`) đã quote đúng dialect | MUST |
| FR-02.19 | Menu ngữ cảnh MUST chỉ hiện hành động khả dụng theo capability và quyền | MUST |
| FR-02.20 | Cây MUST hiển thị màu connection (FR-01.12) làm dải màu bên trái node | SHOULD |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `NavPane` | `packages/ui/src/panes/NavPane.tsx` | **đã có** — thay `TREE` tĩnh bằng dữ liệu RPC |
| `TreeNodeRow` | `…/panes/TreeNodeRow.tsx` | tách ra từ `NavPane` |
| `ObjectsView` | `packages/ui/src/views/ObjectsView.tsx` | **đã có** — thêm Detail view + ảo hoá |
| `InfoPane` | `packages/ui/src/panes/InfoPane.tsx` | **đã có** — nối dữ liệu thật |
| `ColumnChooser` | `…/views/ColumnChooser.tsx` | mới |
| `ObjectContextMenu` | `…/menus/ObjectContextMenu.tsx` | mới |

Trạng thái bắt buộc: empty (schema rỗng → "Chưa có bảng nào" + nút Tạo bảng) · loading (skeleton
rows, không spinner toàn màn hình) · ready · error (banner trong pane, cây vẫn dùng được) ·
unsupported (loại object không hỗ trợ → không hiện folder).

## 5. Hợp đồng RPC

```ts
export const introspectObjects = defineUnary({
  name: 'introspect.objects',
  params: z.object({
    connectionId: z.string().uuid(),
    database: z.string(),
    schema: z.string().optional(),
    kinds: z.array(ObjectKind).min(1),
    /** Bỏ qua cache đĩa, đọc lại từ server. */
    refresh: z.boolean().default(false),
  }),
  result: z.object({
    objects: z.array(ObjectSummary),
    /** Dùng cho preview-token fingerprint và phát hiện cache cũ. */
    fingerprint: z.string(),
    fromCache: z.boolean(),
  }),
  permission: 'connection:read',
  audit: 'metadata',
})

export const introspectTableMeta = defineUnary({
  name: 'introspect.tableMeta',
  params: z.object({ connectionId: z.string().uuid(), ref: ObjectRef }),
  result: TableMeta,          // columns, primaryKey, indexes, foreignKeys, triggers, options, comment
  permission: 'connection:read',
  audit: 'metadata',
})
```

Còn lại: `introspect.databases`, `.schemas`, `.routineMeta`, `.viewMeta`, `.ddl`,
`.dependencies`, `.identifiers`, `.estimateRowCount`.

## 6. Logic engine

### Chống N+1 (bắt buộc)

`listObjects` cho 5 000 bảng phải là **một** truy vấn. Ví dụ PostgreSQL:

```sql
SELECT c.relname, c.relkind, c.reltuples::bigint AS est_rows,
       pg_total_relation_size(c.oid) AS total_bytes,
       obj_description(c.oid, 'pg_class') AS comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = $1 AND c.relkind = ANY($2)
ORDER BY c.relname;
```

**Cấm** vòng lặp gọi `introspect.tableMeta` cho từng bảng để dựng danh sách.

### Cache

```
Khoá cache: (connectionId, database, schema, kind)
Vị trí: <data-dir>/cache/<connectionId>/<hash>.msgpack
TTL: 15 phút (cấu hình được)
Vô hiệu hoá: topic schema.invalidated, F5, đổi phiên bản app
```

Sau `ddl.apply*`, engine phát `schema.invalidated { connectionId, database, schema }`;
client gọi `queryClient.invalidateQueries({ queryKey: ['connection', id, 'schema', db] })`.

## 7. Khác biệt theo engine

| Engine | Khác biệt | Xử lý |
|---|---|---|
| MySQL | Không có schema | Cây chỉ 3 cấp: conn → database → nhóm object |
| PostgreSQL | database ≠ kết nối được; muốn đổi database phải mở connection mới | Mở database khác → engine tạo session mới trên cùng profile, trong suốt với UI |
| SQLite | Một database duy nhất | Cây: conn → nhóm object |
| Oracle | Schema ≡ user; rất nhiều schema hệ thống | Mặc định ẩn schema hệ thống, có toggle |
| MongoDB | Collection thay bảng; không có cột | Detail view hiện: số document, dung lượng, index; không hiện cột |
| Redis | Không có object; chỉ key | Cây: conn → db0..db15; Objects tab thay bằng Key Browser (SPEC-13) |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Không có quyền đọc catalog | `PERMISSION_DENIED` | Node hiện icon khoá + "Không có quyền xem" |
| Mất kết nối khi đang mở node | `CONNECTION_LOST` | Node hiện icon lỗi, nút "Thử lại"; cây không sập |
| Schema bị xoá bởi người khác | `OBJECT_NOT_FOUND` | Tự làm mới node cha, thông báo toast |
| Cache đọc lỗi/hỏng | — | Bỏ qua cache, đọc từ server, xoá file cache; **không** báo lỗi cho người dùng |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| `introspect.objects` với 5 000 bảng | ≤ 800 ms |
| Render Objects view 5 000 dòng | ≤ 150 ms tới first paint (ảo hoá) |
| Mở node cây có 500 con | ≤ 200 ms |
| Đọc từ cache đĩa | ≤ 30 ms |
| `introspect.identifiers` cho code completion | ≤ 1 s, chạy nền, không chặn UI |

## 10. Bảo mật

Quyền `connection:read`. Không có thao tác phá huỷ trong SPEC này (xoá object → SPEC-06).
Read-only không ảnh hưởng (toàn bộ là đọc). Menu ngữ cảnh **phải** ẩn hành động ghi khi
connection ở read-only hoặc actor không có quyền.

## 11. i18n

`nav.filterPlaceholder`, `nav.refresh`, `nav.noPermission`, `nav.loadFailed`,
`objects.list`, `objects.detail`, `objects.chooseColumns`, `objects.empty`,
`objects.col.*` (12 khoá), `info.general`, `info.ddl`, `info.using`, `info.usedBy`,
`info.identifiers`, `group.new`, `group.moveTo`, `group.excludeFrom`

## 12. Tiêu chí chấp nhận

```
[ ] FR-02.01–20 đều có test
[ ] Lazy load: mở node chỉ gọi RPC 1 lần, lần 2 lấy từ cache — test bằng spy
[ ] 5 000 bảng: introspect ≤ 800 ms (integration), render ≤ 150 ms (Playwright trace)
[ ] Không N+1: integration test đếm số truy vấn gửi tới server
[ ] schema.invalidated sau DDL → cây tự làm mới (e2e)
[ ] Node lỗi không làm sập cây (test lỗi có chủ đích)
[ ] Cây đúng hình dạng cho MySQL (không schema) và PostgreSQL (có schema)
[ ] Tên object có unicode/dấu cách/từ khoá SQL hiển thị và copy đúng
[ ] 5 trạng thái UI đều có · i18n vi/en/ja đủ
```
