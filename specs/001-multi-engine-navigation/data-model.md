# Phase 1 · Data Model: Đối ứng đa engine + điều hướng theo cấp

**Branch**: `001-multi-engine-navigation` | **Date**: 2026-08-20

Đây là mô hình **dữ liệu điều hướng**, không phải lược đồ database. Dự án này không sở hữu lược
đồ nào — nó làm việc với lược đồ của khách hàng, biết được lúc chạy (xem plan.md CT-1).

---

## 1. `ObjectKind` — sinh từ năng lực, không viết tay

**Nguồn sự thật**: khoá của `ObjectCapabilities` trong `packages/contract/src/capabilities.ts`.

```
ObjectKind = keyof ObjectCapabilities
  = 'table' | 'view' | 'materializedView' | 'procedure' | 'function' | 'package'
  | 'trigger' | 'sequence' | 'index' | 'domain' | 'type' | 'event'
  | 'collection' | 'keyspace'
```

**Vì sao sinh chứ không viết tay**: enum `introspect.objects.kind` hiện có 5 giá trị
(`table, view, function, procedure, trigger`) trong khi `ObjectCapabilities` có 14. Hai danh
sách viết tay tách rời nhau là đúng cơ chế đã tạo ra lỗi "khai `objects.trigger: true` nhưng
`listObjects` không bao giờ trả trigger". Sinh từ một nguồn thì không thể lệch.

Cần thêm một hằng runtime (`OBJECT_KINDS`) song song với kiểu, giống cách `ERROR_CODES` đã làm
cho `ErrorCode` — vì zod cần mảng giá trị lúc chạy, không chỉ kiểu.

**Bất biến IV-A**: với mọi kết nối, mọi `kind` mà `capabilities.objects[kind] === true` phải
liệt kê được qua `introspect.objects({ kind })`. Vi phạm phải bị conformance bắt, không phải
bị người dùng phát hiện.

---

## 2. `HierarchyShape` — số cấp của cây, dẫn xuất

Không phải thực thể lưu trữ. Là **hàm thuần** của `capabilities.hierarchy`:

```
levelsOf(caps) -> ('database' | 'namespace')[]
  hasCatalogs && hasSchemas  -> ['database', 'namespace']
  hasCatalogs && !hasSchemas -> ['database']
  !hasCatalogs && hasSchemas -> ['namespace']
  !hasCatalogs && !hasSchemas -> []
```

| Engine | levels | Cây đầy đủ |
|---|---|---|
| PostgreSQL, SQL Server | database, namespace | conn › db › schema › nhóm › object |
| MySQL, MongoDB, Redis | database | conn › db › nhóm › object |
| Oracle | namespace | conn › schema › nhóm › object |
| SQLite | (rỗng) | conn › nhóm › object |

⚠ **ODQ-1 chưa chốt**: SQLite hiện khai `hasCatalogs: false` nhưng `listDatabases()` trả `main`
+ các tệp đã `ATTACH`. Nếu giữ `false` thì database đã attach **không có đường nào tới được**
trong cây. Khuyến nghị đổi thành `true`. Phải quyết trước khi viết mã cây.

---

## 3. `NavNode` — một dòng trong cây

| Trường | Ý nghĩa | Ghi chú |
|---|---|---|
| `path` | định danh **duy nhất**, cũng là khoá React và khoá của map trạng thái mở | đường dẫn đầy đủ, không phải tên. Hai bảng trùng tên ở hai namespace phải cho hai `path` khác nhau |
| `level` | `'connection' \| 'database' \| 'namespace' \| 'group' \| 'object'` | thay cho `NavKind` hiện tại đang trộn cấp với loại object |
| `objectKind` | chỉ có khi `level === 'object'` hoặc `'group'` | dùng để tra bảng ánh xạ nội dung |
| `label` | chuỗi hiển thị | tên object giữ nguyên, không escape; nhãn nhóm qua i18n |
| `ref` | `{ connectionId, database?, namespace?, objectKind?, name? }` | ngữ cảnh đầy đủ để mở nội dung, không phải parse lại từ `path` |
| `expandable` | node còn cấp con hay là lá | suy từ `level` + `levelsOf(caps)` |
| `state` | `'collapsed' \| 'loading' \| 'expanded' \| 'error'` | bốn trạng thái tách rời, phục vụ FR-005 |
| `error` | thông báo khi `state === 'error'` | **không** mang `cause`, không mang chuỗi kết nối |

**Bất biến IV-B**: `path` phải hàm-một-một với `ref`. Hai `ref` khác nhau không được cho cùng
`path` (nếu không, hai node mở/đóng cùng nhau — đúng lỗi của cây tĩnh cũ).

**Bất biến IV-C**: `state === 'error'` của một node **không** được lan sang node khác. Lỗi của
một kết nối không làm mất phần cây đã nạp của kết nối khác.

**Chuyển tiếp trạng thái**:

```
collapsed --(người dùng bung)--> loading
loading   --(dữ liệu về)-------> expanded
loading   --(lỗi)-------------->  error
loading   --(người dùng đóng)-->  collapsed   [huỷ việc nạp — FR-008]
expanded  --(người dùng đóng)-->  collapsed   [giữ cache, FR-004 không nạp lại]
error     --(thử lại)---------->  loading
expanded  --(làm mới)---------->  loading     [FR-007, làm mới một nhánh]
```

---

## 4. `ObjectGroup` — nhóm đối tượng, dữ liệu khai báo

Bảng ở tầng UI, **không** ở contract (nhãn cần i18n, thứ tự là quyết định thị giác):

| Trường | Ý nghĩa |
|---|---|
| `kind` | một `ObjectKind` |
| `labelKey` | khoá i18n (vi/en/ja) |
| `order` | thứ tự hiển thị trong cây |

Danh sách nhóm hiện ra = `OBJECT_GROUPS.filter(g => caps.objects[g.kind]).sort(by order)`.

**Bất biến IV-D**: bảng này phải phủ **đủ 14** `ObjectKind`. Thiếu một khoá nghĩa là engine nào
khai `true` cho khoá đó sẽ có một nhóm không có nhãn. Kiểm bằng kiểu (`Record<ObjectKind, …>`),
không bằng mắt.

---

## 5. `ContentKind` và `ToolKind` — tách hai khái niệm đang bị trộn

`View` hiện tại trộn hai thứ khác nhau:

```
View = 'objects' | 'data' | 'sql' | 'design' | 'er' | 'compare' | 'backup' | 'jobs'
         └── nội dung của một đối tượng ──┘   └────── công cụ độc lập ──────┘
```

Tách thành:

```
ContentKind = 'objectList' | 'data' | 'design' | 'definition' | 'er'
ToolKind    = 'sql' | 'compare' | 'backup' | 'jobs' | 'monitor'
```

`definition` là **loại còn thiếu** — nó là lý do 6 trong 8 loại đối tượng hiện "không dẫn tới
đâu" (FR-015). Function, procedure, trigger, sequence không có màn hình nào cả.

### Bảng ánh xạ `ObjectKind → ContentKind`

| ObjectKind | ContentKind mặc định | ContentKind khác cũng mở được |
|---|---|---|
| `table` | `data` | `design`, `er` |
| `view` | `data` | `definition` |
| `materializedView` | `data` | `definition` |
| `procedure`, `function`, `package` | `definition` | — |
| `trigger`, `event` | `definition` | — |
| `sequence`, `domain`, `type` | `definition` | — |
| `index` | `definition` | — |
| `collection` | `data` | `definition` (cấu trúc suy luận) |
| `keyspace` | `data` | — |

**Bất biến IV-E**: bảng này phải là `Record<ObjectKind, ContentKind>` — kiểu buộc phủ đủ 14
khoá. Đây là cách FR-015 ("không loại nào dẫn tới màn hình trắng") được ép bằng máy chứ không
bằng review.

---

## 6. `Tab` — danh tính là trung tâm

Quyết định của người chủ dự án (2026-08-20): khác đối tượng → tab mới; cùng đối tượng → focus
tab cũ; chưa có → mở mới.

```
ObjectTabIdentity = {
  type: 'object'
  contentKind: ContentKind
  connectionId: string
  database?: string
  namespace?: string
  objectKind: ObjectKind
  name: string
}

ToolTabIdentity = {
  type: 'tool'
  toolKind: ToolKind
  seq: number          // cho phép nhiều phiên soạn SQL song song
  connectionId?: string
}
```

**So danh tính**: hai tab đối tượng bằng nhau khi **mọi** trường bằng nhau. Hệ quả có ý:

- `data` của bảng X ≠ `design` của bảng X → **hai tab** (khác `contentKind`)
- `bán_hàng.đơn_hàng` ≠ `kho.đơn_hàng` → **hai tab** (khác `namespace`)
- cùng bảng X qua hai lần nhấn → **một tab**, lần thứ hai chỉ chuyển tiêu điểm

Tab công cụ **không bao giờ** bằng nhau nếu khác `seq` → mở bao nhiêu phiên SQL cũng được
(FR-018).

| Trường của Tab | Ý nghĩa |
|---|---|
| `identity` | như trên; khoá của danh sách tab |
| `title` | nhãn hiển thị, suy từ identity |
| `dirty` | có nội dung chưa lưu hay không → FR-014e hỏi trước khi đóng |
| `missing` | đối tượng đã bị xoá phía server → FR-014 kịch bản 6 |

**Bất biến IV-F**: trong danh sách tab không có hai phần tử cùng `identity`.
**Bất biến IV-G**: mở hoặc đóng một tab không làm đổi trạng thái của tab khác (FR-014d).

### Chỗ đặt state

| Loại state | Đặt ở đâu | Vì sao |
|---|---|---|
| danh sách tab, tab đang focus | zustand (client state) | là UI state, đúng ADR-0007 và Constitution VI |
| dữ liệu bên trong tab (dòng, metadata) | TanStack Query, khoá gồm đường dẫn đối tượng | mỗi tab tự có cache riêng; đóng/mở không mất → IV-G gần như miễn phí |
| nội dung **chưa lưu** (SQL đang soạn, ô đang sửa) | **ODQ-2 chưa chốt** | không thuộc cả hai chỗ trên; khuyến nghị một store riêng khoá bằng identity của tab |

---

## 7. `EngineProfile` — đặc tả đường đi cho engine chưa hiện thực

Không phải thực thể lúc chạy. Là **bảng trong tài liệu** phải trả lời đủ 4 câu cho mỗi engine
(FR-021), để khi viết driver thì phần UI chỉ là khai báo:

| Câu hỏi | SQL Server (hiện thực) | Oracle | MongoDB | Redis |
|---|---|---|---|---|
| Cấp nào? | database + namespace | namespace (=user) | database | database (số 0–15) |
| Nhóm nào? | table, view, procedure, function, trigger, index, sequence | table, view, procedure, function, package, trigger, sequence, type | collection, index | (không có nhóm kiểu bảng — duyệt khoá) |
| Chọn vào hiện gì? | data / definition theo bảng §5 | như SQL Server | collection → data; cấu trúc → definition **kèm nhãn suy luận** | khoá → giá trị theo kiểu của khoá |
| Không làm được gì? | (điền khi hiện thực) | định danh mặc định CHỮ HOA — khai sai thì mọi lần mở bảng báo không tìm thấy | không có bảng, không có schema, cấu trúc chỉ là suy luận từ mẫu | không có bảng/schema; liệt kê phải theo lô và không được làm treo server |

**Bất biến IV-H**: Redis và MongoDB **chưa** biểu diễn được đầy đủ bằng SPI hiện tại
(`DriverConnection.dialect` bắt buộc là một dialect SQL; `execute` nhận `{ sql }`). ADR-0011 còn
treo. Feature này **chỉ đặc tả** hai engine đó, và bảng trên là đầu vào cho ADR đó — không phải
lời hứa rằng chúng cắm được ngay.

---

## Ma trận truy vết yêu cầu → thực thể

| Yêu cầu | Thực thể / bất biến |
|---|---|
| FR-001, FR-003, FR-002 | `NavNode.state` khởi tạo `collapsed` cho mọi node; bỏ trạng thái mở mặc định (R-8) |
| FR-004, FR-005, FR-007, FR-008 | chuyển tiếp trạng thái §3; IV-C |
| FR-006 | IV-B |
| FR-009, FR-012 | `levelsOf(caps)` §2 |
| FR-010, FR-011 | `ObjectGroup` §4; IV-A; IV-D |
| FR-013 | §2, §4, §5 đều là hàm thuần của capability — không có chỗ nào nhận `driverId` |
| FR-014a→e | `Tab` §6; IV-F, IV-G |
| FR-015 | IV-E (kiểu buộc phủ đủ 14 khoá) |
| FR-016 | `NavNode.ref` §3 (đủ ngữ cảnh để hiện đường dẫn) |
| FR-017, FR-020 | `capabilities` + `ContentKind` khác cũng mở được §5 |
| FR-018, FR-019 | `ToolTabIdentity.seq` §6; chỗ đặt state §6 |
| FR-021→025 | `EngineProfile` §7 |
| FR-026→030 | không phải thực thể dữ liệu — xem quickstart.md |
