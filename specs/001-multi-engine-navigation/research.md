# Phase 0 · Research: Đối ứng đa engine + điều hướng theo cấp

**Branch**: `001-multi-engine-navigation` | **Date**: 2026-08-20
**Spec**: [spec.md](spec.md)

Mọi kết luận dưới đây đối chiếu với mã nguồn thật trong repo, không dựa trên ký ức. Chỗ nào là
suy đoán thì ghi rõ là suy đoán.

---

## R-1 · Cấu trúc phân tầng đã biểu diễn được bằng dữ liệu chưa?

**Decision**: ĐÃ CÓ. Không cần mở rộng contract cho phần này.

`CapabilitySet.hierarchy` có đúng hai cờ cần thiết:

```
hierarchy: { hasCatalogs: boolean; hasSchemas: boolean }
```

Bốn tổ hợp phủ hết bảy engine:

| hasCatalogs | hasSchemas | Engine | Cây |
|---|---|---|---|
| ✔ | ✔ | PostgreSQL, SQL Server | conn › database › schema › nhóm › object |
| ✔ | ✘ | MySQL, MongoDB, Redis | conn › database › nhóm › object |
| ✘ | ✔ | Oracle | conn › schema(=user) › nhóm › object |
| ✘ | ✘ | SQLite | conn › nhóm › object |

**Rationale**: Đây là dữ liệu đã có sẵn và đã được thu hẹp theo server thật lúc connect. Thêm
một khái niệm mới cho việc này là tạo nguồn sự thật thứ hai.

**Alternatives considered**: thêm trường `levels: Level[]` tường minh. Bỏ vì hai cờ boolean đã
đủ diễn tả cả bốn tổ hợp, và mọi engine trong tầm nhìn đều rơi vào một trong bốn.

⚠ **Điểm cần chú ý khi hiện thực**: SQLite hiện có `hasCatalogs: false` nhưng
`listDatabases()` lại trả `main` + các tệp đã `ATTACH`. Hai điều này mâu thuẫn về mặt khái
niệm. Cây phải đi theo capability (không hiện cấp database cho SQLite) hoặc capability phải
sửa thành `true`. **Chưa quyết** — xem Open Design Question ODQ-1.

---

## R-2 · Nhóm đối tượng suy từ đâu?

**Decision**: suy từ `CapabilitySet.objects` (14 cờ đã có), qua một bảng khai báo thứ tự và
nhãn hiển thị nằm ở tầng UI.

`objects` đã có: `table, view, materializedView, procedure, function, package, trigger,
sequence, index, domain, type, event, collection, keyspace`.

**Rationale**: UI chỉ cần lọc `Object.entries(caps.objects).filter(([, v]) => v)` rồi tra nhãn
+ thứ tự. Không có `if (driverId === …)` nào. Thêm engine mới = engine đó tự khai cờ của nó.

**Alternatives considered**:
- Để driver trả danh sách nhóm: linh hoạt hơn nhưng cho phép hai driver dùng hai tên khác nhau
  cho cùng khái niệm, và i18n nhãn phải đi theo dữ liệu — tệ hơn.
- Danh sách nhóm cố định trong UI: đúng cái đang có và đúng cái phải bỏ.

⚠ **Nợ đã tìm ra khi rà soát**: `objects.trigger` và `objects.index` khai `true` cho SQLite
nhưng `listObjects` chỉ trả `table`/`view` — đã sửa và có test chống hồi quy ở
`packages/driver-sqlite/src/scope.test.ts`. **PostgreSQL và MySQL chưa được kiểm điều tương
tự** → việc đầu tiên của Phase 1 là mở rộng test đó cho cả hai.

---

## R-3 · `introspect.objects` có đủ để liệt kê mọi nhóm không?

**Decision**: CHƯA. Cần mở rộng `kind` trong contract.

Hiện tại:

```ts
kind: z.enum(['table', 'view', 'function', 'procedure', 'trigger']).optional()
```

Thiếu: `materializedView`, `index`, `sequence`, `package`, `domain`, `type`, `event`,
`collection`, `keyspace`.

**Decision chi tiết**: đổi `kind` thành một enum **suy ra từ khoá của `ObjectCapabilities`**,
để hai bên không thể lệch nhau — cùng nguyên tắc đã dùng cho `ERROR_CODES`/`ErrorCode` khi sửa
lỗi mã lỗi không tồn tại tuần trước.

**Rationale**: enum viết tay tách rời khỏi capability là đúng cách để tái tạo lỗi "khai một
đằng, hiện thực một nẻo". Sinh từ một nguồn thì không thể lệch.

**Alternatives considered**: `kind: z.string()`. Bỏ vì mất hoàn toàn kiểm chứng ở ranh giới, và
`check-contract` sẽ không phát hiện được gì.

---

## R-4 · Ánh xạ loại đối tượng → loại nội dung đặt ở đâu?

**Decision**: một bảng khai báo ở tầng UI, `ObjectKind → ContentKind`, cộng một `ContentKind`
mở rộng từ `View` hiện có.

`View` hiện tại (`packages/contract/src/models/view.ts`):

```ts
export type View = 'objects' | 'data' | 'sql' | 'design' | 'er' | 'compare' | 'backup' | 'jobs'
```

Tám giá trị này trộn hai khái niệm khác nhau:
- **nội dung của một đối tượng**: `objects` (danh sách), `data`, `design`, `er`
- **công cụ độc lập**: `sql`, `compare`, `backup`, `jobs`

**Decision**: tách rõ hai loại tab. Tab gắn đối tượng có danh tính
`(contentKind, connectionId, database?, schema?, kind, name)`; tab công cụ có danh tính
`(toolKind, seq)`. Cả hai nằm trong một danh sách tab.

Thiếu một loại nội dung: **định nghĩa** (dùng cho function/procedure/trigger/view) — hiện chưa
có `View` nào cho nó, và đây chính là lý do 6 trong 8 loại đối tượng "không dẫn tới đâu"
(FR-015). Phải thêm.

**Rationale**: Bảng ánh xạ là dữ liệu → thêm engine/loại object mới không sửa mã điều khiển.
Việc tách tab-đối-tượng khỏi tab-công-cụ là điều kiện để FR-018 (công cụ mở độc lập) và
FR-014c (chọn lại thì focus) cùng đúng — hai yêu cầu này xung đột nếu chỉ có một khái niệm tab.

**Alternatives considered**:
- Giữ `View` làm một union phẳng: không diễn tả được "hai tab cùng contentKind nhưng khác đối
  tượng", nên không làm được FR-014a.
- Để mỗi view tự quyết định nó nhận đối tượng nào: rải logic ra 8 chỗ, không kiểm được tập trung.

---

## R-5 · Trạng thái tab đặt ở đâu?

**Decision**: danh sách tab và tab đang focus vào **client state** (zustand, `useShellStore`);
dữ liệu bên trong mỗi tab vẫn ở **server state** (TanStack Query) theo khoá gồm đường dẫn đối
tượng.

**Rationale**: ADR-0007 và Constitution VI đều nói cùng một điều: server state ở TanStack
Query, UI state ở zustand. Danh sách tab là UI state. Nhờ khoá query gồm đường dẫn, hai tab của
hai bảng khác nhau tự có cache riêng, và đóng/mở tab không làm mất cache — thoả FR-014d gần như
miễn phí.

**Alternatives considered**: giữ dữ liệu tab trong chính state của tab. Bỏ vì phải tự viết lại
cache, và mất tính năng làm mới/stale sẵn có.

⚠ **Chưa rõ**: trạng thái *chưa lưu* (nội dung soạn SQL, sửa ô chưa apply) không thuộc cả hai
chỗ trên. Đây là state có chủ (owned) của tab. Phải quyết chỗ đặt trước khi làm FR-014e
(hỏi trước khi đóng) — xem ODQ-2.

---

## R-6 · Driver SQL Server: thư viện và những chỗ dễ sai

**Decision**: `mssql` (bọc `tedious`), thuần JavaScript, không native.

**Rationale**: không có native binding → đóng gói desktop không phải rebuild theo ABI Electron,
tránh đúng loại rủi ro mà `better-sqlite3` đang mang. Đây cũng là lựa chọn đã ghi trong
`docs/04-plan/driver-roadmap.md` §3.

**Alternatives considered**: `tedious` trực tiếp (thấp hơn một tầng, phải tự quản pool);
`msnodesqlv8` (native, cần ODBC driver cài sẵn trên máy — loại ngay).

Bốn chỗ dễ sai, rút từ tài liệu và từ kinh nghiệm hai driver trước:

1. **Streaming là API theo SỰ KIỆN.** `request.stream = true` phát `row`/`done`/`error`, không
   phải async iterator. Phải bọc thành `AsyncIterable` và nối backpressure bằng
   `request.pause()`/`resume()`. Bọc sai thì IV-1 (≤ 3 chunk trong RAM) bị phá **mà test nhỏ
   vẫn xanh** — đúng loại lỗi chỉ lộ ra ở bảng lớn của khách hàng.
2. **Ba cấp phân tầng.** SQL Server là engine đầu tiên có cả catalog và schema. `sys.*` là
   per-database, nên introspect phải chạy trong ngữ cảnh database đúng, không phải
   `master`. Đây là chỗ luồng ở US2 bị thử thật.
3. **Comment nằm ở `sys.extended_properties`**, không phải `COMMENT ON`. Bỏ qua thì cột
   comment luôn rỗng.
4. **TLS.** `encrypt: true` mặc định; `trustServerCertificate` mặc định **false** và KHÔNG có
   tuỳ chọn UI để bỏ qua kiểm chứng chỉ — cùng nguyên tắc với SSH host key (security.md §8).
   Ghi chú thực tế: container Azure SQL Edge dùng chứng chỉ tự ký, nên môi trường **kiểm** phải
   bật `trustServerCertificate` qua biến môi trường của riêng nó, không phải mặc định của sản phẩm.

Huỷ: `request.cancel()`. Tham số: `@pN` (theo tên, không theo vị trí) — `formatParameter` đã có
nhánh `mssql`.

---

## R-7 · Môi trường kiểm SQL Server

**Decision**: `mcr.microsoft.com/mssql/server:2022-latest` do testcontainers tự dựng, mật khẩu
sinh trong lần chạy. Container `azure-sql-edge` sẵn có **chỉ** dùng cho thử tay.

**Rationale** (đo được, không phỏng đoán): `docker ps` trên máy phát triển cho thấy
`crm-app_sqldb` chạy ảnh `mcr.microsoft.com/azure-sql-edge:2.0.0` ở cổng 1433, và nó đang giữ
database nghiệp vụ `crm_customer_proposal`.

Hai lý do phải dùng ảnh khác cho việc kiểm:

1. **Azure SQL Edge là bản rút gọn.** Kết luận "driver SQL Server chạy được" dựa trên Edge là
   kết luận quá mức — đúng loại sai lệch mà bộ conformance tồn tại để ngăn. Nhóm nào không kiểm
   được trên biến thể nào phải in ra kèm lý do (FR-027, FR-030).
2. **Container đó giữ dữ liệu thật.** Conformance tạo và xoá bảng để dựng lược đồ mẫu. Trỏ nó
   vào `crm_customer_proposal` là chạy DDL trên dữ liệu của một ứng dụng đang hoạt động.

**Alternatives considered**:
- Dùng luôn container Edge sẵn có cho conformance: nhanh hơn (không kéo ~1.5 GB), nhưng vướng
  cả hai lý do trên. Nếu người chủ dự án ưu tiên tốc độ, phương án chấp nhận được là **tạo một
  database riêng trên container đó** và ghi rõ giới hạn của Edge — cần quyết định (ODQ-3).
- Không dùng container, chỉ mock: không phát hiện được bất kỳ vấn đề nào ở R-6, tức là mất toàn
  bộ giá trị của US7.

Bảo vệ bắt buộc (SR-007): bộ kiểm phải **từ chối chạy** khi database đích không mang dấu hiệu
là database dùng riêng cho việc kiểm. Cách rẻ nhất: đích phải khớp một tiền tố quy ước và bộ
kiểm tự tạo nó, không nhận database có sẵn.

---

## R-8 · Trạng thái khởi động sạch

**Decision**: bỏ mọi giá trị mở/chọn mặc định trong state khởi tạo.

Hiện tại state khởi tạo mở sẵn hai nhánh và chọn sẵn một bảng, nhưng các khoá đó thuộc bộ dữ
liệu mẫu cũ. Trên workspace thật chúng không khớp đường dẫn nào, nên hệ quả là: không mở đúng
gì cả, mà cũng không sạch.

**Rationale**: FR-001 và FR-002 đòi trạng thái sạch và 0 truy vấn lúc mở app. Giữ lại giá trị
mặc định nào cũng là rủi ro: nếu nó tình cờ khớp một connection thật, app sẽ tự kết nối tới
database production khi mở — đúng điều FR-002 cấm.

**Alternatives considered**: đổi khoá mặc định cho khớp workspace thật. Bỏ ngay: không có
"workspace thật" chung nào, và nó vẫn vi phạm FR-002.

---

## R-9 · Bàn phím và trạng thái rỗng (Constitution X)

**Decision**: cây phải điều hướng được đủ bằng bàn phím ngay từ bản đầu, không để lại sau.

Mức tối thiểu: mũi tên lên/xuống di chuyển, phải/trái bung/đóng, Enter mở nội dung, Home/End,
gõ chữ để nhảy tới. Tiêu điểm phải thấy được. Node dùng đúng vai trò accessibility của cây
(`tree`/`treeitem` cùng `aria-expanded`, `aria-level`).

**Rationale**: Constitution X là NON-NEGOTIABLE, và một cây điều hướng là đúng loại thành phần
mà nếu bỏ bàn phím thì sau này phải viết lại chứ không "thêm vào" được.

---

## Open Design Questions (cần quyết trong Phase 1, không chặn Phase 0)

| # | Câu hỏi | Ảnh hưởng | Khuyến nghị |
|---|---|---|---|
| ODQ-1 | SQLite khai `hasCatalogs: false` nhưng `listDatabases()` trả `main` + tệp ATTACH. Cây bỏ cấp database cho SQLite, hay sửa capability thành `true`? | quyết định cây SQLite có 3 hay 4 cấp; ảnh hưởng cả phần `opts.database` vừa sửa | Sửa capability thành `true`: ATTACH là thật, và bỏ cấp đó đi thì database đã attach không có đường nào tới được |
| ODQ-2 | Trạng thái *chưa lưu* của tab đặt ở đâu (zustand? bên trong component? một store riêng)? | quyết định FR-014e (hỏi trước khi đóng) làm được sạch hay chắp vá | Một store riêng cho "bản nháp theo tab", khoá bằng danh tính tab — để zustand không phình và component không giữ state sống lâu hơn chính nó |
| ODQ-3 | Conformance SQL Server: kéo ảnh mssql đầy đủ (~1.5 GB, chậm lần đầu) hay dùng container Edge sẵn có với một database riêng? | thời gian chạy CI/local vs độ tin của kết luận | Ảnh đầy đủ cho conformance; Edge cho thử tay. Nếu ưu tiên tốc độ thì đảo lại nhưng PHẢI ghi giới hạn Edge vào báo cáo kiểm |

Ba câu này là quyết định **kỹ thuật nội bộ**, không đổi phạm vi hay hành vi người dùng, nên
không chặn `/speckit.tasks`. Nhưng ODQ-1 phải chốt trước khi viết mã cây.
