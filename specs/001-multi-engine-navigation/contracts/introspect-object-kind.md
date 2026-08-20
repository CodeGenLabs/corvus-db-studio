# Contract Change: `ObjectKind` và `introspect.objects`

**Branch**: `001-multi-engine-navigation` | **Date**: 2026-08-20

Dự án không dùng REST/GraphQL. Hợp đồng là **registry RPC khai bằng zod** (ADR-0008), gồm 76
method, mỗi method có `params`, `result`, `permission`, `audit`, và được `pnpm check:contract`
kiểm bằng máy. Tài liệu này mô tả thay đổi hợp đồng mà feature này cần — đây là **toàn bộ**
thay đổi hợp đồng; mọi thứ còn lại nằm trong tầng UI hoặc driver.

---

## C-1 · `ObjectKind` sinh từ `ObjectCapabilities`

**Vị trí**: `packages/contract/src/capabilities.ts`

**Trước**: `ObjectCapabilities` là một interface 14 cờ boolean. Không có kiểu nào đại diện cho
"tên một loại đối tượng", và không có mảng runtime nào.

**Sau**: thêm một hằng runtime là nguồn sự thật, kiểu suy ra từ nó.

```
OBJECT_KINDS = ['table','view','materializedView','procedure','function','package',
                'trigger','sequence','index','domain','type','event',
                'collection','keyspace'] as const

ObjectKind = (typeof OBJECT_KINDS)[number]
ObjectCapabilities = Record<ObjectKind, boolean>
```

**Vì sao đảo chiều dẫn xuất** (trước: interface là gốc; sau: mảng là gốc): zod cần **giá trị lúc
chạy** để dựng enum, kiểu TypeScript không dùng được. Nếu viết mảng riêng bên cạnh interface thì
có hai danh sách viết tay — đúng cơ chế đã tạo ra lỗi `objects.trigger: true` mà `listObjects`
không bao giờ trả trigger. Cùng cách đã áp dụng cho `ERROR_CODES`/`ErrorCode` khi sửa lỗi mã lỗi
không tồn tại trên dây.

**Tương thích**: `ObjectCapabilities` giữ đúng 14 khoá như cũ → mọi driver hiện có không phải
sửa. Đây là thay đổi **cộng thêm**, không phá.

**Rủi ro**: `Record<ObjectKind, boolean>` khắt khe hơn interface cũ ở một điểm — nếu driver nào
thiếu một khoá thì giờ sẽ báo lỗi biên dịch. Đã kiểm: cả 3 driver hiện có đều khai đủ 14 khoá.

---

## C-2 · Mở rộng `introspect.objects.kind`

**Vị trí**: `packages/contract/src/methods/introspect.ts`

**Trước**:

```
kind: z.enum(['table', 'view', 'function', 'procedure', 'trigger']).optional()
```

Thiếu 9 trong 14 loại: `materializedView`, `package`, `sequence`, `index`, `domain`, `type`,
`event`, `collection`, `keyspace`.

**Sau**:

```
kind: z.enum(OBJECT_KINDS).optional()
```

**Hệ quả**: `permission` và `audit` **không đổi** (`introspect:read` / `none`) → không cần thêm
phạm vi quyền, không tăng nợ handler. `check-contract` vẫn đếm 76 method như trước.

**Vì sao đây là chỗ chặn thật**: không có thay đổi này thì FR-010 (nhóm suy từ capability) chạy
được ở tầng UI nhưng gọi xuống sẽ bị chặn ở validate params — người dùng thấy nhánh "Sequences"
rồi bấm vào nhận `INVALID_INPUT`. Tệ hơn cả việc không hiện nhánh đó.

---

## C-3 · Tách `ContentKind` khỏi `ToolKind`

**Vị trí**: `packages/contract/src/models/view.ts`

**Trước**:

```
View = 'objects' | 'data' | 'sql' | 'design' | 'er' | 'compare' | 'backup' | 'jobs'
```

Một union phẳng trộn hai khái niệm: 4 giá trị là nội dung của một đối tượng, 4 giá trị là công
cụ độc lập.

**Sau**:

```
ContentKind = 'objectList' | 'data' | 'design' | 'definition' | 'er'
ToolKind    = 'sql' | 'compare' | 'backup' | 'jobs' | 'monitor'
View        = ContentKind | ToolKind      // giữ lại cho mã hiện có, sẽ bỏ dần
```

**Ba điểm cần biết**:

1. `definition` là giá trị **mới** — hiện chưa có loại nội dung nào cho function, procedure,
   trigger, sequence. Đây chính là lý do 6 trong 8 loại đối tượng "không dẫn tới đâu".
2. `objects` đổi tên thành `objectList` để không nhầm với `ObjectKind`. Đổi tên là thay đổi
   **phá vỡ** với mã hiện có → giữ `View` như union của hai loại để chuyển dần, không sửa 8
   view trong một lần.
3. `monitor` được thêm vào `ToolKind` dù `MonitorView` đã tồn tại trong `packages/ui/src/views/`
   mà **không** có trong `View` — tức là màn hình đó hiện không có đường nào mở được. Sửa luôn.

**Vì sao đặt ở contract chứ không ở UI**: `View` đã ở contract từ trước (`models/view.ts`), và
loại nội dung là thứ mà bản desktop lẫn bản web đều phải hiểu giống nhau. Nhưng **bảng ánh xạ**
`ObjectKind → ContentKind` thì ở UI — vì nó là quyết định trình bày, và nhãn cần i18n.

---

## Những gì KHÔNG thay đổi

Ghi ra để người đọc không phải tự kiểm:

| Không đổi | Vì sao |
|---|---|
| `CapabilitySet.hierarchy` | hai cờ `hasCatalogs`/`hasSchemas` đã đủ diễn tả cả 4 tổ hợp phân tầng (research.md R-1) |
| Số method RPC (76) | feature này không thêm method nào |
| `permission` / `audit` của mọi method | không thêm phạm vi quyền |
| `HANDLER_DEBT` trong `tools/check-contract.ts` | không hiện thực thêm handler → nợ không giảm, cũng không tăng |
| `introspect.ddl`, `introspect.routineMeta` | đã có sẵn và đủ cho `ContentKind = 'definition'` — không cần method mới |
| Giao thức khung WebSocket | không đổi |

**Điểm đáng chú ý**: `introspect.routineMeta` và `introspect.ddl` **đã tồn tại trong hợp đồng**
nhưng chưa có handler. Nghĩa là loại nội dung `definition` không cần method mới — nó cần *hiện
thực handler cho method đã khai*. Điều đó thuộc phạm vi task, không phải thay đổi hợp đồng.

---

## Cách kiểm thay đổi hợp đồng

```bash
pnpm check:contract        # 76 method, permission/audit/ADR-0010 hợp lệ
pnpm verify                # gồm cả typecheck: driver thiếu khoá ObjectKind sẽ đỏ ở đây
```

Test âm bắt buộc (làm hỏng có chủ ý rồi hoàn nguyên, dán output cả hai lần):

1. Xoá một khoá khỏi `OBJECT_KINDS` → driver khai khoá đó phải **đỏ lúc biên dịch**.
2. Thêm một `kind` lạ vào lời gọi `introspect.objects` → phải bị chặn ở validate params với
   `INVALID_INPUT`, không phải đi tới driver.
