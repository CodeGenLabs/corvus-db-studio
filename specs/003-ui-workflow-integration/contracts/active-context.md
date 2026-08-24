# Contract: ngữ cảnh hoạt động (nội bộ `packages/ui`)

**Feature**: 003-ui-workflow-integration · **Date**: 2026-08-24

Hợp đồng nội bộ tầng UI. Nó là nguồn sự thật duy nhất cho câu hỏi "người dùng đang làm việc ở đâu" —
thứ hoàn toàn thiếu hiện nay và là nguyên nhân gốc của C-04, C-06, C-07, C-08.

Nơi ở: `packages/ui/src/context/`, state nằm trong `packages/ui/src/store/shell.ts` (Zustand, ADR-0007).
Hình dạng đầy đủ xem [data-model.md E1](../data-model.md).

---

## 1. Ai đọc, ai ghi

```
GHI (chỉ 4 nơi):
  NavPane            — chọn / mở node          → connectionId, database, namespace, selection
  ObjectsView        — chọn đối tượng          → selection
  connection.open    — kết quả mở kết nối      → connectionState, capabilities, lastError
  connection.status  — thông tin server        → serverVersion, serverEncoding

ĐỌC (mọi nơi còn lại):
  TitleBar · StatusBar · Toolbar · InfoPane · TabStrip     → hiển thị (FR-002)
  commands/availability.ts                                 → quyết định khả dụng (FR-010)
  mọi view và dialog                                        → biết đang làm việc trên gì
```

**Ràng buộc**: không component nào ngoài 4 nơi trên được ghi vào ngữ cảnh. Nhiều nơi ghi là cách
tạo ra đúng loại lệch mà C-07 đang biểu hiện (5 vùng UI nói 5 điều khác nhau).

---

## 2. Phạm vi theo tab

Ngữ cảnh là thuộc tính của **tab**, không phải một giá trị đơn ở gốc store (FR-004).

```
shell.ts:  tabs: Tab[]  +  activeTabId
           Tab { ..., context: ActiveContext }

useActiveContext()  →  ngữ cảnh của tab đang hoạt động
```

**Vì sao**: mở đồng thời PostgreSQL và MySQL rồi chuyển tab phải cho gating khác nhau. Một giá trị
toàn cục sẽ làm hai tab lẫn nhau — edge case mà spec nêu tường minh.

**Hệ quả cần giữ**: đóng kết nối (FR-007) phải xử lý **mọi** tab có `connectionId` đó, không chỉ tab
đang hoạt động.

---

## 3. Nguồn dữ liệu — không thêm lần gọi RPC nào

| Trường | Nguồn | Khoá cache |
|---|---|---|
| `connectionId`, `connectionName`, `driverId` | `connection.list` | `['connections']` |
| `capabilities`, `connectionState`, `lastError` | `connection.open` | `['connection', id, 'open']` |
| `serverVersion`, `serverEncoding` | `connection.status` | `['connection', id, 'status']` |
| `database` | `introspect.databases` + lựa chọn của người dùng | `['connection', id, 'databases']` |
| `namespace` | `introspect.schemas` + lựa chọn của người dùng | `['connection', id, 'schemas', db]` |
| `selection` | thao tác người dùng | không cache |

**Ràng buộc quan trọng**: hai khoá đầu **đã tồn tại** trong `useNavTree.ts` với
`staleTime: 5 * 60_000`. Hook `useCapabilities` phải dùng **đúng khoá đó**, không tạo khoá mới —
nếu tạo khoá mới thì mỗi kết nối bị `connection.open` hai lần, và hai bản `CapabilitySet` có thể lệch.
Đây là lý do C-05 tồn tại: dữ liệu đã có trong cache, chỉ không ai ngoài cây điều hướng đọc.

---

## 4. Quy tắc mặc định an toàn

```
capabilities === null  ⇒  mọi lệnh có Availability.capability đều 'disabled'
                          với lý do 'capabilities-unknown'
```

**Cố ý khác** `useNavTree.ts:85` hiện tại, chỗ đó làm `caps?.hierarchy ? caps.hierarchy.hasCatalogs : true`
— tức **mặc định là có** catalog khi chưa biết. Ở cây điều hướng, đoán sai chỉ tốn một lần fetch vô ích.
Ở lệnh ghi, đoán sai có thể chạy DDL không đúng engine. Nên hai chỗ dùng hai mặc định khác nhau, và
**phải có comment giải thích tại chỗ** theo coding-rules ("bắt buộc comment ở chỗ trông như lỗi nhưng là đúng").

---

## 5. Bất biến — kiểm được bằng máy

| # | Bất biến | Cách kiểm |
|---|---|---|
| A-1 | `capabilities !== null` ⇒ `connectionState === 'open'` | Test khẳng định trên phép chuyển trạng thái |
| A-2 | `lastError !== null` ⇒ `connectionState === 'error'` | Test khẳng định |
| A-3 | `connectionState === 'closed'` ⇒ `database`, `namespace`, `capabilities` đều `null` và `selection.names` rỗng | Test khẳng định — FR-007 |
| A-4 | Mọi phần tử `selection.names` cùng `selection.kind`; chọn lẫn loại ⇒ `kind === null` | Test khẳng định |
| A-5 | `selection.anchor !== null` ⇒ `anchor ∈ selection.names` | Test khẳng định |
| A-6 | `namespace !== null` ⇒ `capabilities.hierarchy.hasSchemas === true` | Test khẳng định — chặn hiện cấp schema rỗng trên MySQL |
| A-7 | Không tệp nào trong `TitleBar`/`StatusBar`/`Toolbar`/`InfoPane`/`dictionaries.ts` chứa tên kết nối, database, engine, hay phiên bản dạng chuỗi cứng | Test khẳng định — cổng của SC-001, sửa C-06/C-07 |
| A-8 | `lastError.detail` không chứa mật khẩu, chuỗi kết nối đầy đủ, đường dẫn nội bộ, vết ngăn xếp | **Test hồi quy trên cả 7 engine** — không chứng minh được bằng kiểu (Cấm 6, SR-002) |

---

## 6. Cái bị xoá bỏ

| Hiện có | Thay bằng | Vì sao không giữ song song |
|---|---|---|
| `shell.ts` `selTable: string` | `context.selection` | Hai nguồn sự thật là đúng loại lỗi C-04 gây ra |
| `shell.ts` `selNode: string` | `context.selection` + `connectionId`/`database`/`namespace` | Chuỗi phẳng không mang nổi phân cấp 3 tầng của PostgreSQL |
| `shell.ts` `selField: string` | `context.selection` với `kind: 'sub-element'` | |
| Chuỗi cứng ở `TitleBar:87`, `StatusBar:26`, `InfoPane:78/86/202`, `Toolbar:133/139`, `UsersDialog:65` | đọc từ ngữ cảnh | FR-002 cấm tường minh |
| `dictionaries.ts` khoá `tabData: 'country @sakila'` (cả 3 ngôn ngữ) | tiêu đề tab sinh từ ngữ cảnh | Tên đối tượng không phải nội dung dịch được |
| `CommandPalette.tsx:32-34` danh sách bảng cứng | `introspect.objects` của kết nối đang mở | FR-008 |
