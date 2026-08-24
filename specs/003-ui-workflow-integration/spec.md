# Feature Specification: Kết nối toàn bộ workflow UI với DB thật & bộ kiểm thử UI chống hồi quy

**Feature Branch**: `003-ui-workflow-integration`
**Created**: 2026-08-24
**Status**: Draft
**Input**: User description: "source code hiện tại đã gần hoàn thiện, tuy nhiên tôi gặp vấn đề là rất nhiều lỗi trên UI như các thao tác không hoạt động, ví dụ connect db xong, mở connection thì lỗi, các button bấm như cho có (không phụ thuộc vào connection đang mở, loại db đang sử dụng là gì), lên kế hoạch kết nối toàn bộ workflow hoạt động của các chức năng (phải chạy đúng) và test cho UI để đảm bảo không phát sinh nữa (mong muốn của tôi là đang chạy container của các loại db, tôi muốn seed data vào như table, view, function,... và test UI phải hoạt động đúng với hiện trạng của db thực tế). Tham khảo hướng dẫn của Navicat để xem các chức năng còn thiếu và flow hoạt động."

---

## Bối cảnh: kết quả rà soát mã nguồn hiện tại

Rà soát ngày 2026-08-24 trên nhánh `main` (`61df6d8`). Đây là **hiện trạng đã kiểm chứng**, làm cơ sở cho toàn bộ yêu cầu bên dưới.

### B.1 — Backend đã đủ, UI mới dùng một phần

| # | Phát hiện | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| C-01 | Backend đăng ký **76 phương thức RPC**; `packages/ui` chỉ gọi **30** | Đối chiếu `packages/engine/src/handlers/*` + `router.ts` với toàn bộ literal `'<ns>.<method>'` trong `packages/ui/src` | 46 năng lực đã có backend nhưng **không có đường vào từ UI** |
| C-02 | Nhóm chưa hề được UI gọi: `tx.*` (4), `security.*` (5), `job.*` (6), `file.*` (5), `ddl.applyRoutine/applyView/dropObject/maintain` + 2 preview, `connection.close/delete/duplicate/get/parseUri/status/toUri`, `introspect.dependencies/identifiers/routineMeta`, `data.fkLookup`, `query.cancel/parse/history.clear`, `schedule.history/update`, `workspace.*`, `ai.chat/explainPlan` | cùng phép đối chiếu C-01 | Transaction, phân quyền, job/wizard nền, thao tác file, DDL cho view/routine, quản lý kết nối đều **không dùng được từ UI** |
| C-03 | 4 view không gọi backend một lần nào | `BackupView.tsx`, `CompareView.tsx`, `VirtualObjectsView.tsx`, `LoginView.tsx` — 0 lần xuất hiện `useClient`/`client.request` | Backup, Compare, Virtual Group là **màn hình tĩnh** |

### B.2 — Không có "ngữ cảnh hoạt động" dùng chung → nút bấm không phụ thuộc kết nối

| # | Phát hiện | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| C-04 | Store shell **không** lưu kết nối/database/schema/đối tượng đang hoạt động, cũng không lưu `capabilities`. Chỉ có 3 chuỗi rời rạc `selTable`, `selNode`, `selField` | `packages/ui/src/store/shell.ts:49-51` | Không có nguồn sự thật để bất kỳ nút nào biết "đang mở kết nối nào, engine gì" — **đây là gốc của triệu chứng "button bấm như cho có"** |
| C-05 | `capabilities` chỉ được đọc ở đúng một nơi trong toàn bộ UI (cây điều hướng) | `packages/ui/src/components/useNavTree.ts:72-75`; toàn `packages/ui/src` chỉ có 3 lần khớp chuỗi `capabilit` | Toolbar / MenuBar / ObjectToolbar / mọi dialog **không** rẽ nhánh theo năng lực engine |
| C-06 | Toolbar hiển thị trạng thái kết nối và phiên bản server **cứng trong mã** | `Toolbar.tsx:133` (`t.connected` luôn xanh) và `Toolbar.tsx:139` (`MySQL 8.0.36 · utf8mb4`) | Mở SQL Server / Postgres / Mongo vẫn thấy "MySQL 8.0.36" và luôn "đã kết nối" |
| C-07 | Chuỗi `sakila @ Local Dev` cứng ở nhiều vùng UI | `TitleBar.tsx:87`, `StatusBar.tsx:26`, `InfoPane.tsx:78/86/202`, `UsersDialog.tsx:65`, `i18n/dictionaries.ts` (tiêu đề tab `country @sakila` ở cả 3 ngôn ngữ) | Toàn bộ chrome của ứng dụng nói sai về đối tượng đang mở |
| C-08 | Command Palette liệt kê bảng cứng trong mã | `CommandPalette.tsx:32-34` (`customer`, `film`, `actor` "in sakila") | Tìm nhanh đối tượng trả về kết quả không tồn tại trong DB thật |
| C-09 | Dialog kết nối gợi ý mặc định trỏ tới host/DB không tồn tại | `ConnectionDialog.tsx:57` (`10.4.12.31` / `sakila`) | Người dùng mới tạo kết nối theo mặc định sẽ thất bại |

### B.3 — Nút và menu dẫn tới hành động sai hoặc không có hành động

| # | Phát hiện | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| C-10 | 3 nút Toolbar khác nhau (`Table`, `View`, `Function`) dẫn tới **cùng một** `setView('objects')`, không lọc theo loại đối tượng | `Toolbar.tsx:30-32` | Bấm "View" hay "Function" cho ra kết quả giống "Table" |
| C-11 | Menu `Import wizard…` và `Export wizard…` chỉ mở tab Automation | `MenuBar.tsx:81-82` | Hai chức năng di trú dữ liệu **không tồn tại** dù menu vẫn hiện |
| C-12 | Kiểu dữ liệu mục menu cho phép `action: null` (mục chết) | `MenuBar.tsx:8` | Mục menu có thể tồn tại mà không làm gì, không có phản hồi cho người dùng |
| C-13 | Toàn bộ Toolbar **không có** thuộc tính vô hiệu hoá; cả `packages/ui` chỉ có 29 lần dùng `disabled` trên hơn 100 component | `Toolbar.tsx` (không có `disabled`), đếm toàn cây | Mọi nút luôn bấm được kể cả khi chưa có kết nối, hoặc engine không hỗ trợ |
| C-14 | Lỗi mở kết nối chỉ hiện dưới dạng ký tự `!` màu đỏ, thông điệp nằm trong `title` (tooltip) và không có đường phục hồi | `NavPane.tsx:245, 286, 296, 306`; `useNavTree.ts` đặt `retry: 0` cho `connection.open` | Đúng triệu chứng người dùng báo: "connect db xong, mở connection thì lỗi" — **không biết lỗi gì, không có cách thử lại** |
| C-15 | Một lần nhấp chuột trên cây vừa chọn vừa mở/đóng nhánh; không có tách biệt "chọn" và "kết nối" | `NavPane.tsx:28-34, 75, 166` | Khác quy ước Navicat (nhấp đúp để kết nối), và không có bước nào ghi nhận ngữ cảnh cho các view khác |
| C-19 | **Không có menu chuột phải ở bất kỳ đâu.** Hai component context menu đã tồn tại và đã được export ra ngoài, nhưng số lần xuất hiện `onContextMenu` trong **toàn repo bằng 0** — không có gì render chúng | `components/navigation/ObjectContextMenu.tsx`, `components/grid/CellContextMenu.tsx`, cả hai export ở `index.ts:49,51`; đếm `onContextMenu` toàn `packages` + `apps` = 0 | Người dùng mất lối vào chính của mọi thao tác theo ngữ cảnh; đối chiếu Navicat có **321** chỗ nhắc right-click / pop-up menu |
| C-20 | Hai component context menu chết đó còn vi phạm luật dự án: hard-code chuỗi tiếng Việt (bỏ qua hệ i18n 3 ngôn ngữ) và hard-code hex `#ef4444` | `ObjectContextMenu.tsx` (nhãn `Sao chép tên`, `Xoá (Drop …)`, màu `#ef4444`); `docs/05-rules/ui-rules.md` mục 1.1 cấm hex trong component | Nếu đem dùng lại nguyên trạng sẽ mang theo hai vi phạm vào sản phẩm |

### B.4 — Không có bộ kiểm thử UI

| # | Phát hiện | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| C-16 | Script `pnpm test:e2e` gọi `playwright test`, nhưng Playwright **không** nằm trong dependency, **không** có tệp cấu hình, **không** có tệp `*.spec.ts` nào trong repo | `package.json` `scripts.test:e2e`; tìm toàn repo: 0 kết quả cho `playwright*` và `*.spec.ts` | Cổng kiểm thử E2E là **hư cấu**; `pnpm verify` không hề chạy nó |
| C-17 | 71 tệp test hiện có đều là unit/integration ở tầng dưới; không có test nào dựng UI rồi thao tác trên DB thật | Đếm `*.test.ts*` trong `packages` + `apps` | Mọi hồi quy UI như B.2/B.3 đều **lọt lưới** `pnpm verify` |
| C-18 | Hạ tầng DB Docker và seed **đã có sẵn** cho 7 engine, gồm cả view/function/procedure/trigger và bộ dữ liệu lớn | `docker/dev-db/compose.yaml` + `docker/dev-db/seed/{postgres,mysql,mssql,oracle,sqlite,mongodb,redis}/*`; CLI `pnpm db:up/reset/doctor/bulk` | Nền tảng cho kiểm thử UI trên DB thật đã sẵn sàng, chỉ **thiếu tầng kiểm thử UI** ở trên |

### B.5 — Đối chiếu tài liệu Navicat: chức năng còn thiếu

Nguồn tham chiếu: *Navicat User Guide* (384 trang, mục lục 24 chương). Đối chiếu với `packages/contract` + `packages/ui`:

| Chương Navicat | Trạng thái Corvus | Ghi chú |
|---|---|---|
| 2 — User Interface (Navigation / Object / Information Pane, List–Detail–ER view) | ⚠️ Có khung 4 pane đúng; thiếu **Detail view**, **Choose Columns**, **Flatten Object List**, **Show Hidden Items** | |
| 4 — Connection (URI, Edit, Flush, Manage Connections, Connection Colorings) | ⚠️ Có tạo/sửa/test; thiếu **New Connection with URI**, **Copy URI**, **Manage Connections**, **Flush**, tô màu kết nối | `connection.parseUri` / `toUri` đã có backend, UI chưa gọi (C-02) |
| 5 — Server Objects (Designer cho từng loại, Maintain Objects, Empty/Truncate Table) | ⚠️ Có Table/View/Routine/Trigger Designer; thiếu **Maintain Objects**, **Empty/Truncate Table**, designer cho Tablespace/Event/Package/Sequence/Type | `ddl.maintain` đã có backend, UI chưa gọi |
| 6 — Data Editor (Grid + Form View, Sort/Find/Replace, Filter, Raw data, Field Info) | ⚠️ Có Grid + Form; thiếu **Tree View / JSON View cho MongoDB**, **Redis key editor** | |
| 7 — Data Profiling | ❌ Chưa có | |
| 8 — Query (Editor, Builder, Parameters, Explain, Snippets, Ask AI, Fix Query with AI) | ⚠️ Gần đủ; thiếu **hủy truy vấn đang chạy** (`query.cancel` chưa gọi), Debug PL/SQL | |
| 9 — AI Assistant (chat) | ⚠️ Có `ai.generateSql`/`fixSql`; thiếu **chat** (`ai.chat` chưa gọi) | |
| 10 — Model (Conceptual/Logical/Physical, Reverse/Forward Engineering, Data Dictionary) | ⚠️ Có ER Diagram đọc; thiếu **Reverse/Forward Engineering**, **Model Conversion**, **Export Model to SQL** | |
| 11 — Debugger (PL/SQL, PL/pgSQL) | ❌ Chưa có | |
| 12 — Pub/Sub (Redis) | ❌ Chưa có | |
| 13 — Aggregation Pipeline (MongoDB) | ❌ Chưa có | |
| 14 — Data Migration (Import/Export Wizard, Data Transfer, Data & Structure Sync, Dump/Execute SQL) | ❌ Menu tồn tại nhưng không có chức năng (C-11); Compare là màn hình tĩnh (C-03) | **Trong phạm vi tính năng này**: Import/Export → US4 (L-5); Data Transfer / Data Sync / Structure Sync / Dump-Execute SQL → US5 (L-6) |
| 15 — Data Generation | ❌ Chưa có | |
| 16 — Data Dictionary | ❌ Chưa có | |
| 17 — BI (Data Source, Chart, Dashboard) | ❌ Chưa có | |
| 18 — Automation (Batch Job + Schedule) | ⚠️ Có `schedule.*` một phần; `job.*` chưa được UI gọi | |
| 19 — Backup & Restore | ❌ `BackupView` là màn hình tĩnh (C-03) | |
| 20 — Server Security (User/Role/Privilege Designer) | ❌ Dialog tồn tại nhưng 0 lần gọi backend; `security.*` chưa được UI gọi | |
| 21 — Other Tools (Server Monitor, Schema Analysis, Command Monitor, Virtual Grouping, Find in Database, Console, Focus Mode, Share via URI, Favorites) | ⚠️ Có Monitor + Focus Mode; thiếu **Schema Analysis**, **Find in Database**, **Console**, **Share via URI**, **Favorites**; Virtual Grouping là màn hình tĩnh | |
| 22 — Configurations (Options) | ⚠️ Có Settings; `workspace.settings.*` chưa được UI gọi → **thiết lập không được lưu bền** | |
| 23 — Hot Keys | ⚠️ Có Shortcut editor; chưa đối chiếu đủ bảng phím Navicat | |

> **Kết luận rà soát**: vấn đề người dùng gặp **không phải** do thiếu backend. Backend có 76 phương thức và các driver có bảng năng lực đầy đủ (`docs/02-architecture/capability-matrix.md`). Vấn đề là **tầng UI thiếu ngữ cảnh hoạt động dùng chung, thiếu gating theo năng lực, thiếu đường dây tới 46 phương thức, và không có bất kỳ kiểm thử UI nào để chặn hồi quy**.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Mở kết nối và thấy ứng dụng phản ánh đúng DB thật (Priority: P1)

Người dùng tạo kết nối tới một trong các DB đang chạy trên Docker, mở kết nối trên cây điều hướng, rồi chọn database → schema → bảng. Toàn bộ ứng dụng — thanh tiêu đề, thanh trạng thái, thanh công cụ, khung thông tin, tiêu đề tab — hiển thị đúng kết nối, database, schema, đối tượng và loại/phiên bản engine đang thực sự dùng. Khi mở kết nối thất bại, người dùng đọc được nguyên nhân cụ thể ngay trên giao diện và có nút thử lại.

**Why this priority**: Đây là gốc của triệu chứng "button bấm như cho có" (C-04). Không có ngữ cảnh hoạt động dùng chung thì mọi chức năng phía sau đều không thể đúng. Đồng thời sửa trực tiếp lỗi người dùng báo: "mở connection thì lỗi" (C-14).

**Independent Test**: Với DB Docker đang chạy, mở lần lượt từng engine và kiểm tra mọi vùng chrome hiển thị đúng tên kết nối/database/engine/phiên bản; rồi tắt một container và kiểm tra thông điệp lỗi cùng nút thử lại. Không cần bất kỳ chức năng nào khác của US2–US5.

**Acceptance Scenarios**:

1. **Given** một kết nối PostgreSQL trỏ tới DB Docker đang chạy, **When** người dùng mở kết nối, **Then** thanh trạng thái và thanh công cụ hiển thị tên kết nối, database mặc định, engine `PostgreSQL` và phiên bản server thật, không hiển thị chuỗi cố định nào.
2. **Given** đã mở kết nối MySQL, **When** người dùng chọn một bảng trên cây, **Then** thanh tiêu đề, tiêu đề tab và khung thông tin đều nói về đúng bảng và đúng database đó.
3. **Given** đang mở kết nối A, **When** người dùng chuyển sang mở kết nối B thuộc engine khác, **Then** toàn bộ chrome cập nhật sang B và không còn dấu vết thông tin của A.
4. **Given** container DB đã tắt, **When** người dùng mở kết nối, **Then** giao diện hiển thị thông điệp lỗi nêu rõ nguyên nhân (không tiết lộ thông tin nội bộ hệ thống) kèm hành động thử lại; nhấn thử lại khi container đã bật trở lại sẽ mở được kết nối mà không cần khởi động lại ứng dụng.
5. **Given** chưa có kết nối nào được mở, **When** người dùng nhìn vào ứng dụng, **Then** chrome hiển thị trạng thái "chưa kết nối" thay vì trạng thái "đã kết nối" giả.
6. **Given** đang mở một kết nối, **When** người dùng đóng kết nối, **Then** ngữ cảnh hoạt động được xoá, mọi tab phụ thuộc kết nối đó được xử lý rõ ràng, và chrome trở về trạng thái "chưa kết nối".

---

### User Story 2 — Nút bấm phản ánh đúng năng lực của engine đang dùng (Priority: P1)

Người dùng chuyển giữa các engine khác nhau. Mỗi lệnh trên thanh công cụ, thanh menu, thanh đối tượng và menu ngữ cảnh chỉ ở trạng thái dùng được khi engine hiện tại thực sự hỗ trợ và khi ngữ cảnh đủ điều kiện. Lệnh không dùng được ở trạng thái vô hiệu hoá kèm lời giải thích ngắn gọn lý do.

**Why this priority**: Đây là phần thứ hai của khiếu nại người dùng — "không phụ thuộc vào loại db đang sử dụng". Không gating thì người dùng vẫn bấm được lệnh vô nghĩa (ví dụ tạo Function trên SQLite, tạo Sequence trên MySQL, xem Materialized View trên MySQL) và nhận lỗi từ tầng dưới.

**Independent Test**: Mở từng engine, chụp lại trạng thái dùng được/vô hiệu hoá của toàn bộ lệnh, đối chiếu với `docs/02-architecture/capability-matrix.md`. Kiểm được độc lập với US3–US5.

**Acceptance Scenarios**:

1. **Given** đang mở kết nối SQLite, **When** người dùng xem các lệnh tạo đối tượng, **Then** lệnh tạo Procedure và Function ở trạng thái vô hiệu hoá kèm giải thích "engine không hỗ trợ", đúng theo bảng năng lực.
2. **Given** đang mở kết nối MySQL, **When** người dùng xem cây điều hướng, **Then** không xuất hiện nhóm Materialized View, Sequence, Domain, Type; nhưng có nhóm Event.
3. **Given** đang mở kết nối Redis, **When** người dùng xem các lệnh, **Then** các lệnh chỉ có nghĩa với RDBMS (Explain, ER Diagram, Table Designer) đều vô hiệu hoá, còn lệnh làm việc với key ở trạng thái dùng được.
4. **Given** đang mở kết nối MongoDB, **When** người dùng xem cây và các lệnh, **Then** hiện Collection thay cho Table, Explain khả dụng, còn Sequence/Trigger không xuất hiện.
5. **Given** chưa mở kết nối nào, **When** người dùng xem thanh công cụ, **Then** mọi lệnh phụ thuộc kết nối đều vô hiệu hoá; chỉ các lệnh không phụ thuộc kết nối (tạo kết nối, thiết lập, trợ giúp) còn dùng được.
6. **Given** đã chọn một view (không phải bảng), **When** người dùng xem thanh đối tượng, **Then** các lệnh chỉ áp dụng cho bảng (ví dụ Truncate, Maintain) vô hiệu hoá, còn lệnh áp dụng cho view khả dụng.
7. **Given** một lệnh bị vô hiệu hoá, **When** người dùng đưa chuột lên hoặc dùng bàn phím tới lệnh đó, **Then** giao diện nêu rõ **lý do** (thiếu kết nối / engine không hỗ trợ / sai loại đối tượng / thiếu quyền), không chỉ vô hiệu hoá im lặng.
8. **Given** ba lệnh Table, View, Function trên thanh công cụ, **When** người dùng bấm từng lệnh, **Then** mỗi lệnh dẫn tới danh sách đối tượng đã lọc theo đúng loại tương ứng, không cho ra cùng một kết quả.
9. **Given** đang mở kết nối SQLite, **When** người dùng nhấp phải một bảng trên cây, **Then** lệnh tạo Function **không xuất hiện** trong menu (engine không hỗ trợ), nhưng trên thanh công cụ nó vẫn hiện ở trạng thái vô hiệu hoá kèm lý do — hai cách trình bày khác nhau của cùng một quyết định khả dụng.
10. **Given** đang chọn nhiều bảng, **When** người dùng nhấp phải vùng chọn, **Then** lệnh Drop và Maintain khả dụng cho cả tập, còn lệnh Design Table vô hiệu hoá kèm lý do "chỉ áp dụng cho một đối tượng".
11. **Given** tiêu điểm bàn phím đang ở một bảng trên cây, **When** người dùng nhấn `Shift+F10`, **Then** context menu mở cho đúng bảng đó; sau khi nhấn Escape, tiêu điểm trở về bảng đó.

---

### User Story 3 — Bộ kiểm thử UI chạy trên DB Docker thật, chặn hồi quy (Priority: P1)

Nhà phát triển bật các container DB, nạp seed gồm bảng, view, function, procedure, trigger, index và dữ liệu mẫu, rồi chạy một lệnh duy nhất. Bộ kiểm thử dựng giao diện thật, thao tác như người dùng (mở kết nối, duyệt cây, mở bảng, sửa dữ liệu, chạy truy vấn) và khẳng định giao diện khớp với **hiện trạng thật** của DB. Nếu một nút mất đường dây hoặc một vùng chrome nói sai, bộ kiểm thử thất bại.

**Why this priority**: Người dùng yêu cầu rõ "đảm bảo không phát sinh nữa". Nếu không có cổng này, US1/US2 sẽ thoái hoá trở lại. Đây là điều kiện để tin vào mọi tuyên bố "đã xong".

**Independent Test**: Chạy bộ kiểm thử trên nhánh hiện tại — nó phải **thất bại** ở các hạng mục C-06, C-07, C-10, C-13; sau khi US1/US2 hoàn tất, nó phải xanh. Bản thân bộ kiểm thử kiểm được độc lập.

**Acceptance Scenarios**:

1. **Given** container DB chưa bật, **When** nhà phát triển chạy bộ kiểm thử UI, **Then** bộ kiểm thử dừng ngay với thông điệp nêu rõ container nào thiếu và lệnh cần chạy để bật, thay vì thất bại rải rác.
2. **Given** container đã bật và seed đã nạp, **When** bộ kiểm thử chạy, **Then** với mỗi engine nó xác nhận cây điều hướng liệt kê **chính xác** tập bảng/view/function/procedure/trigger có trong seed — không thiếu, không thừa.
3. **Given** seed vừa được thay đổi (thêm một bảng), **When** bộ kiểm thử chạy lại mà giao diện chưa cập nhật, **Then** bộ kiểm thử thất bại; nghĩa là mọi khẳng định đều lấy từ DB thật, không có danh sách cứng trong test.
4. **Given** một tập thao tác ghi dữ liệu, **When** bộ kiểm thử thực hiện, **Then** mỗi thao tác ghi đi qua bước xem trước câu lệnh, và trạng thái DB sau đó được xác nhận bằng cách truy vấn lại DB.
5. **Given** bộ kiểm thử vừa chạy xong, **When** chạy lại lần nữa ngay lập tức, **Then** kết quả giống hệt lần trước (bộ kiểm thử tự dọn hoặc tự đặt lại dữ liệu, không phụ thuộc thứ tự chạy).
6. **Given** bộ kiểm thử UI, **When** nó được đưa vào cổng chất lượng chung của dự án, **Then** cổng chất lượng thất bại nếu bộ kiểm thử UI thất bại, và không còn tồn tại lệnh kiểm thử nào chỉ có tên mà không có nội dung.
7. **Given** một hồi quy kiểu "nút không có đường dây", **When** ai đó tháo đường dây của một lệnh đã hoàn thiện, **Then** có ít nhất một khẳng định trong bộ kiểm thử thất bại.

---

### User Story 4 — Hoàn thiện các workflow chức năng đang treo (Priority: P2)

Người dùng dùng các chức năng mà hiện nay chỉ có vỏ: quản lý kết nối (URI, nhân bản, đóng, xoá), quản lý người dùng/quyền, giao dịch khi sửa dữ liệu, thao tác bảo trì đối tượng, DDL cho view và routine, sao lưu/phục hồi, so sánh cấu trúc và dữ liệu, nhập/xuất dữ liệu, nhóm ảo, và lưu bền thiết lập. Mỗi lệnh còn hiện trên giao diện đều dẫn tới một hành động thật; lệnh chưa làm được thì không xuất hiện.

**Why this priority**: Đây là phần khối lượng lớn nhất, nhưng chỉ có nghĩa sau khi US1 (ngữ cảnh) và US2 (gating) đã đứng vững — nếu làm trước sẽ phải làm lại.

**Independent Test**: Với mỗi lệnh trên giao diện, xác nhận nó dẫn tới một thay đổi quan sát được trên DB thật hoặc một kết quả đọc được từ DB thật. Kiểm được theo từng nhóm chức năng, độc lập với nhau.

**Acceptance Scenarios**:

1. **Given** danh sách toàn bộ lệnh hiển thị trên giao diện, **When** kiểm kê từng lệnh, **Then** không còn lệnh nào không có hành động, và không còn hai lệnh khác tên dẫn tới cùng một hành động không phân biệt được.
2. **Given** người dùng có một chuỗi URI kết nối, **When** dán vào chức năng tạo kết nối bằng URI, **Then** các trường được điền tự động và tạo được kết nối thật; ngược lại, từ một kết nối đã có, người dùng lấy được URI của nó.
3. **Given** đang sửa nhiều dòng dữ liệu với chế độ tự động ghi đã tắt, **When** người dùng chọn huỷ bỏ, **Then** không có thay đổi nào lọt vào DB; khi chọn xác nhận, toàn bộ thay đổi vào DB cùng một lần.
4. **Given** một truy vấn đang chạy lâu, **When** người dùng bấm huỷ, **Then** truy vấn thực sự dừng ở phía server và giao diện trở về trạng thái sẵn sàng.
5. **Given** người dùng mở chức năng quản lý người dùng/quyền trên một engine hỗ trợ, **When** xem danh sách, **Then** danh sách là người dùng và quyền thật trên server đó; mọi thay đổi đều có bước xem trước câu lệnh.
6. **Given** người dùng thay đổi thiết lập ứng dụng, **When** đóng và mở lại ứng dụng, **Then** thiết lập được giữ nguyên.
7. **Given** người dùng chạy sao lưu một database, **When** hoàn tất, **Then** có tệp kết quả thật và có thể phục hồi từ nó vào một database trống, xác nhận bằng cách truy vấn lại dữ liệu.
8. **Given** một tệp dữ liệu và một bảng đích, **When** người dùng chạy luồng nhập dữ liệu và ánh xạ các cột, **Then** số dòng và giá trị trong bảng đích khớp với tệp nguồn, xác nhận bằng truy vấn lại; các dòng bị từ chối được báo cáo kèm lý do thay vì bị bỏ qua im lặng.
9. **Given** một bảng có dữ liệu, **When** người dùng xuất ra tệp rồi nhập lại tệp đó vào một bảng trống cùng cấu trúc, **Then** hai bảng có cùng số dòng và cùng giá trị.

---

### User Story 5 — Bộ công cụ di trú dữ liệu trong menu Tools (Priority: P2)

Người dùng mở menu Tools và dùng được bốn công cụ di trú dữ liệu: **Data Transfer** (chuyển đối tượng và dữ liệu giữa hai kết nối), **Data Synchronization** (so sánh và đồng bộ dữ liệu), **Structure Synchronization** (so sánh và đồng bộ cấu trúc), **Dump / Execute SQL File** (kết xuất ra tệp SQL và chạy tệp SQL). Mỗi công cụ đi theo luồng nhiều bước rõ ràng, kết thúc bằng bước xem trước câu lệnh trước khi ghi.

**Why this priority**: Người dùng chỉ định đây là một phần của mục tiêu cao nhất (L-6), ngang hàng với nhập/xuất dữ liệu. Xếp P2 cùng US4 vì cả hai đều cần ngữ cảnh (US1) và gating (US2) đứng vững trước.

**Independent Test**: Với hai database Docker có cấu trúc và dữ liệu khác nhau, chạy từng công cụ và xác nhận kết quả bằng cách truy vấn lại cả nguồn và đích. Kiểm được độc lập với US4.

**Acceptance Scenarios**:

1. **Given** hai kết nối tới hai engine khác nhau, **When** người dùng chạy Data Transfer chọn một tập bảng, **Then** cấu trúc và dữ liệu của các bảng đó xuất hiện ở đích, xác nhận bằng truy vấn đếm dòng và so khớp giá trị ở cả hai phía.
2. **Given** hai database cùng cấu trúc nhưng lệch dữ liệu, **When** người dùng chạy Data Synchronization, **Then** kết quả liệt kê đúng các dòng thêm/sửa/xoá thật, và sinh ra các câu lệnh đồng bộ để xem trước; sau khi chạy, hai bên khớp nhau.
3. **Given** hai database lệch cấu trúc (thiếu cột, thiếu index, khác kiểu), **When** người dùng chạy Structure Synchronization, **Then** kết quả liệt kê đúng các khác biệt thật và sinh ra câu lệnh đồng bộ để xem trước.
4. **Given** một database có đối tượng và dữ liệu, **When** người dùng kết xuất ra tệp SQL rồi chạy tệp đó vào một database trống, **Then** database đích có cùng tập đối tượng và cùng dữ liệu, xác nhận bằng truy vấn lại.
5. **Given** một engine không hỗ trợ một công cụ nào đó, **When** người dùng mở menu Tools, **Then** công cụ đó vô hiệu hoá kèm lý do, theo US2 — không được miễn trừ gating.
6. **Given** một tác vụ di trú đang chạy, **When** người dùng bấm huỷ, **Then** tác vụ dừng và trạng thái đích không bị để lại dở dang không giải thích được.

---

### User Story 6 — Hàng đợi ưu tiên cho các khoảng trống chức năng còn lại (Priority: P3)

Các khoảng trống còn lại ở mục B.5 (Data Profiling, Debugger, Pub/Sub, Aggregation Pipeline, Data Generation, Data Dictionary, BI, Reverse/Forward Engineering, Find in Database, Console, Share via URI, Favorites, Detail view, Schema Analysis) được rà soát và xếp thành hàng đợi có thứ tự ưu tiên, hoặc tuyên bố ngoài phạm vi sản phẩm kèm lý do. **Không triển khai trong tính năng này.**

**Why this priority**: Ghi lại quyết định để không mất dấu, nhưng triển khai bây giờ sẽ làm loãng mục tiêu sửa lỗi.

**Independent Test**: Rà bảng đối chiếu B.5 và xác nhận không còn hạng mục nào thiếu trạng thái.

**Acceptance Scenarios**:

1. **Given** bảng đối chiếu B.5, **When** rà soát lại sau khi US1–US5 xong, **Then** mỗi hạng mục ❌/⚠️ còn lại có một quyết định rõ ràng: đưa vào hàng đợi (kèm mức ưu tiên) hoặc tuyên bố ngoài phạm vi sản phẩm (kèm lý do).
2. **Given** một chức năng trong hàng đợi được chọn triển khai ở tính năng sau, **When** hoàn tất, **Then** nó tuân thủ đầy đủ US2 (gating theo năng lực) và US3 (có kiểm thử UI trên DB thật) chứ không được miễn trừ.

---

### Edge Cases

- Kết nối bị ngắt giữa phiên (container bị tắt, mạng rớt): giao diện phải chuyển sang trạng thái mất kết nối, không treo vô hạn, và các tab đang mở của kết nối đó phải nói rõ tình trạng.
- Đăng nhập bằng tài khoản chỉ có quyền đọc: các lệnh ghi phải vô hiệu hoá vì thiếu quyền, chứ không để người dùng bấm rồi nhận lỗi từ server.
- Engine cùng loại nhưng phiên bản cũ hơn khả năng (ví dụ MySQL không có CTE, SQLite thiếu `RETURNING`): gating phải theo năng lực **đọc từ server lúc kết nối**, không theo tên engine.
- MySQL nơi `database` trùng với `schema`: cây điều hướng phải hiện một cấp duy nhất, không hiện cấp schema rỗng.
- Mở nhiều kết nối tới các engine khác nhau cùng lúc và chuyển qua lại: ngữ cảnh và gating phải theo **tab đang hoạt động**, không lẫn giữa các kết nối.
- Database rỗng (không có bảng nào): giao diện phải hướng dẫn tạo đối tượng đầu tiên, không hiện danh sách rỗng không lời giải thích.
- Đối tượng có tên chứa dấu, khoảng trắng, hoặc ký tự cần trích dẫn: mọi hiển thị và mọi câu lệnh xem trước phải xử lý đúng theo quy tắc trích dẫn của từng engine.
- Bảng rất lớn (bộ seed có tập 100 nghìn và 1 triệu dòng): mở bảng phải phân trang/streaming, không nạp toàn bộ.
- Bộ kiểm thử UI chạy song song trên nhiều engine: không được tranh chấp dữ liệu lẫn nhau.
- Seed thay đổi nhưng bộ kiểm thử chưa cập nhật: phải thất bại rõ ràng, không âm thầm bỏ qua.
- Một lệnh nhận nhiều đối tượng thất bại **giữa lô** (ví dụ xoá 5 bảng, bảng thứ 3 bị khoá ngoại chặn): người dùng phải biết đối tượng nào đã xong, đối tượng nào lỗi và vì sao — không được chỉ báo một lỗi chung rồi để trạng thái nửa vời không giải thích được. *(Dự án đã có sẵn component cho tình huống này nhưng nó cũng đang là code chết, cùng nhóm với C-19.)*
- Nhấp phải vào một mục **không** thuộc vùng đang chọn: menu phải tác động lên mục dưới con trỏ và cập nhật lại vùng chọn, không tác động lên vùng chọn cũ.
- Nhấp phải khi chưa chọn gì (vùng trống của cây, danh sách, lưới): menu chỉ chứa các lệnh cấp bề mặt (làm mới, tạo mới, thiết lập hiển thị), không chứa lệnh cần đối tượng.

---

## Requirements *(mandatory)*

### Functional Requirements — Ngữ cảnh hoạt động (US1)

- **FR-001**: Ứng dụng MUST duy trì một ngữ cảnh hoạt động dùng chung, gồm: kết nối đang hoạt động, database, schema (nếu engine có), **tập đối tượng đang chọn** (một hoặc nhiều), loại đối tượng, và bộ năng lực cùng thông tin phiên bản của server đó.
- **FR-002**: Mọi vùng hiển thị thông tin về đối tượng đang mở (thanh tiêu đề, thanh trạng thái, thanh công cụ, khung thông tin, tiêu đề tab) MUST lấy dữ liệu từ ngữ cảnh hoạt động; MUST NOT chứa tên kết nối, tên database, tên bảng, tên engine hay phiên bản server cố định trong mã hoặc trong từ điển ngôn ngữ.
- **FR-003**: Khi chưa có kết nối nào được mở, giao diện MUST hiển thị trạng thái "chưa kết nối" một cách rõ ràng và MUST NOT hiển thị trạng thái kết nối thành công.
- **FR-004**: Ngữ cảnh hoạt động MUST gắn với tab đang hoạt động, sao cho chuyển tab giữa hai kết nối khác engine sẽ cập nhật toàn bộ giao diện tương ứng.
- **FR-005**: Khi mở kết nối thất bại, giao diện MUST hiển thị thông điệp lỗi có thể hành động ngay tại chỗ (không chỉ trong tooltip) và MUST cung cấp hành động thử lại không cần khởi động lại ứng dụng.
- **FR-006**: Người dùng MUST phân biệt được hành vi "chọn một nút trên cây" và "mở/kết nối một nút trên cây", theo quy ước của công cụ tham chiếu.
- **FR-007**: Người dùng MUST đóng được kết nối đang mở; khi đóng, ngữ cảnh liên quan MUST được xoá và các tab phụ thuộc MUST được xử lý rõ ràng.
- **FR-008**: Chức năng tìm nhanh đối tượng MUST truy vấn danh sách đối tượng thật của kết nối đang mở; MUST NOT dùng danh sách cố định trong mã.
- **FR-009**: Giá trị gợi ý mặc định khi tạo kết nối MUST hoặc trỏ tới môi trường phát triển thật có tài liệu, hoặc để trống — MUST NOT trỏ tới host/database không tồn tại.

### Functional Requirements — Gating theo năng lực (US2)

- **FR-010**: Mọi lệnh trên giao diện MUST khai báo, trong cùng một khai báo: (a) điều kiện khả dụng theo bốn nhóm — cần kết nối, cần năng lực engine cụ thể, cần loại đối tượng cụ thể, cần quyền cụ thể; và (b) **tập bề mặt** mà lệnh xuất hiện — thanh công cụ, thanh menu, thanh đối tượng, bảng lệnh, và các bề mặt context menu S-01…S-11.
- **FR-011**: Trên các bề mặt tĩnh (thanh công cụ, thanh menu, thanh đối tượng, bảng lệnh), lệnh không thoả điều kiện MUST ở trạng thái vô hiệu hoá và MUST hiển thị lý do vô hiệu hoá khi người dùng đưa chuột lên hoặc di chuyển tiêu điểm bàn phím tới lệnh đó. *(Context menu trình bày cùng quyết định này theo cách khác — xem FR-046B.)*
- **FR-012**: Quyết định khả dụng MUST dựa trên bộ năng lực đọc được từ server lúc kết nối; MUST NOT rẽ nhánh theo định danh loại driver.
- **FR-013**: Cây điều hướng và danh sách đối tượng MUST chỉ hiện các nhóm loại đối tượng mà engine hiện tại hỗ trợ.
- **FR-014**: Các lệnh mở danh sách đối tượng theo loại (bảng, view, hàm, …) MUST dẫn tới danh sách đã lọc đúng loại tương ứng và phân biệt được với nhau.
- **FR-015**: Trạng thái khả dụng của lệnh MUST cập nhật ngay khi ngữ cảnh thay đổi (mở/đóng kết nối, đổi database, đổi đối tượng đang chọn, đổi tab).
- **FR-016**: Khi tài khoản đang dùng không đủ quyền cho một lệnh ghi, lệnh đó MUST vô hiệu hoá kèm lý do thiếu quyền.

### Functional Requirements — Menu chuột phải *(cắt ngang US1–US5, không phải story riêng)*

- **FR-044**: Cả 11 bề mặt S-01…S-11 MUST phản hồi thao tác nhấp phải bằng một menu ngữ cảnh. Hiện tại chưa bề mặt nào phản hồi (C-19).
- **FR-045**: Context menu MUST chỉ chứa các lệnh áp dụng cho **mục tiêu nhấp phải cụ thể** (loại node trên cây, ô so với tiêu đề dòng so với tiêu đề cột, vùng trống, …) theo cột "Mục tiêu nhấp phải" của bảng kiểm kê bề mặt.
- **FR-046**: Context menu MUST dùng đúng **cùng một quyết định khả dụng và cùng một lý do** như thanh công cụ và thanh menu cho cùng một lệnh (không được có hai logic gating song song). Cách **trình bày** quyết định đó thì khác nhau giữa các bề mặt, theo FR-046B.
- **FR-046B**: Trong context menu, lệnh không khả dụng MUST được trình bày theo **lý do** không khả dụng:
  - lý do là *engine không hỗ trợ* → lệnh **không xuất hiện** trong menu (ở kết nối này nó vĩnh viễn không dùng được, giữ mục xám chỉ làm menu dài);
  - lý do là *ngữ cảnh chưa đủ* — chưa có kết nối, sai loại đối tượng, chưa chọn dòng/ô, thiếu quyền → lệnh **xuất hiện ở trạng thái vô hiệu hoá kèm lý do**, vì người dùng có thể tự khắc phục.

  Đây là **khác biệt cố ý** so với thanh công cụ và thanh menu, nơi mọi lệnh không khả dụng đều vô hiệu hoá kèm lý do theo FR-011 và A-03. Lý do: thanh công cụ là bề mặt tĩnh (giữ nguyên hình dạng giúp người dùng học được năng lực của engine), còn context menu bật lên tại con trỏ và phải ngắn để dùng được.
- **FR-047**: Context menu MUST mở tại vị trí con trỏ, MUST đóng khi nhấn Escape hoặc nhấp ra ngoài, và MUST tự điều chỉnh để không tràn khỏi vùng nhìn thấy.
- **FR-047B**: Cả 11 bề mặt MUST mở được context menu **bằng bàn phím** (phím Menu và `Shift+F10`), áp lên mục đang có tiêu điểm. Trong menu, người dùng MUST điều hướng được bằng phím mũi tên, chọn bằng Enter, đóng bằng Escape; khi menu đóng, tiêu điểm MUST trở về đúng mục đã mở menu.
- **FR-048**: Nhãn và lý do vô hiệu hoá trong context menu MUST đi qua hệ đa ngôn ngữ của dự án và MUST dùng token màu; MUST NOT hard-code chuỗi ngôn ngữ hay mã màu (khắc phục C-20).
- **FR-049**: Một lệnh chỉ được coi là **hoàn thành** khi đã xuất hiện đầy đủ trên **mọi** bề mặt nó khai báo ở FR-010, bao gồm các bề mặt context menu. Không lệnh nào được đóng với lý do "context menu làm sau".
- **FR-050**: Mỗi lệnh MUST khai báo nó nhận **một** đối tượng hay nhận **một tập** đối tượng. Tập lệnh nhận nhiều đối tượng giới hạn ở: bảo trì đối tượng (Maintain Objects), xoá đối tượng (Drop), xuất dữ liệu/DDL (Export), và chọn đối tượng cho Data Transfer / Import-Export.
- **FR-051**: Khi người dùng đang chọn nhiều đối tượng, các lệnh chỉ nhận một đối tượng MUST vô hiệu hoá kèm lý do "chỉ áp dụng cho một đối tượng"; MUST NOT âm thầm chỉ tác động lên đối tượng đầu tiên hoặc lên đối tượng dưới con trỏ.
- **FR-052**: Với lệnh nhận nhiều đối tượng, bước xem trước câu lệnh MUST liệt kê câu lệnh cho **toàn bộ** đối tượng trong tập, không chỉ đối tượng đầu tiên.

### Functional Requirements — Kiểm thử UI trên DB thật (US3)

- **FR-017**: Dự án MUST có một **tầng kiểm thử rộng**: dựng giao diện trong môi trường kiểm thử, thao tác qua giao diện (không gọi trực tiếp tầng dưới), nối tới database thật, phủ **cả 7 engine** được hỗ trợ.
- **FR-017B**: Dự án MUST có một **tầng kiểm thử sâu**: điều khiển ứng dụng đã đóng gói thật đầu-cuối, phủ toàn bộ **Luồng cốt lõi L-1…L-6** trên ít nhất 2 engine có đặc tính phân cấp khác nhau (một engine có schema, một engine không có).
- **FR-018**: Cả hai tầng kiểm thử MUST chạy đối với các database thật trong môi trường container của dự án, không dùng dữ liệu giả lập.
- **FR-019**: Bộ dữ liệu seed MUST bao gồm, với mỗi engine có hỗ trợ: bảng có khoá chính và khoá ngoại, view, hàm, thủ tục, trigger, index, và ít nhất một bảng đủ lớn để kiểm tra phân trang.
- **FR-020**: Mọi khẳng định của bộ kiểm thử về nội dung DB MUST được suy ra từ trạng thái DB thật tại thời điểm chạy; MUST NOT dùng danh sách đối tượng cố định trong mã kiểm thử.
- **FR-021**: Bộ kiểm thử MUST kiểm tra điều kiện tiên quyết (container nào đang chạy, seed đã nạp chưa) và dừng sớm với thông điệp chỉ rõ lệnh cần chạy nếu thiếu.
- **FR-022**: Bộ kiểm thử MUST có tính lặp lại: chạy hai lần liên tiếp cho cùng kết quả, tự đặt lại hoặc tự dọn dữ liệu do nó tạo ra.
- **FR-023**: Tầng kiểm thử rộng MUST phủ, đối với **mỗi** engine được hỗ trợ: mở kết nối, liệt kê phân cấp, mở đối tượng của từng loại, đọc dữ liệu có phân trang, sửa dữ liệu qua bước xem trước, chạy truy vấn, và trạng thái khả dụng của toàn bộ lệnh trên giao diện.
- **FR-023B**: Tầng kiểm thử sâu MUST phủ, trên ứng dụng thật, trọn vẹn từng luồng cốt lõi: L-1 mở kết nối, L-2 soạn SQL, L-3 thực thi và đọc kết quả, L-4 sửa dữ liệu có giao dịch, L-5 nhập/xuất dữ liệu, L-6 Data Transfer / Data Sync / Structure Sync / Dump-Execute SQL — mỗi luồng kết thúc bằng một khẳng định đọc lại từ database thật.
- **FR-024**: Cổng chất lượng của dự án MUST bao gồm bộ kiểm thử UI; MUST NOT tồn tại lệnh kiểm thử được khai báo nhưng không có nội dung thực thi.
- **FR-025**: Bộ kiểm thử MUST bao gồm kiểm tra kiểm kê ba chiều: (a) mọi lệnh hiển thị trên giao diện đều có hành động; (b) mọi phương thức phía sau được coi là "đã hoàn thiện" đều có ít nhất một đường vào từ giao diện; (c) mọi lệnh đều **thực sự xuất hiện trên đúng tập bề mặt đã khai báo ở FR-010** — thiếu ở một bề mặt context menu là một thất bại, không phải khiếm khuyết nhỏ.
- **FR-025B**: Bộ kiểm thử MUST xác nhận cả 11 bề mặt S-01…S-11 phản hồi nhấp phải, và với mỗi bề mặt, tập lệnh hiện ra khớp với mục tiêu nhấp phải và với quyết định khả dụng mà cùng lệnh đó cho ở thanh công cụ / thanh menu (theo cách trình bày của FR-046B).
- **FR-025C**: Bộ kiểm thử MUST mở context menu **bằng bàn phím** trên cả 11 bề mặt và xác nhận điều hướng bằng phím mũi tên, chọn bằng Enter, đóng bằng Escape, và tiêu điểm trở về đúng mục ban đầu.

### Functional Requirements — Hoàn thiện workflow (US4)

- **FR-026**: Mọi lệnh còn hiển thị trên giao diện MUST dẫn tới một hành động thật; lệnh chưa triển khai MUST NOT xuất hiện trên giao diện.
- **FR-026B**: **Toàn bộ** các năng lực phía sau hiện chưa có đường vào từ giao diện (46 hạng mục ghi ở C-02) MUST có ít nhất một đường vào từ giao diện khi tính năng này hoàn tất. Không có nhóm nào được hoãn sang tính năng sau.
- **FR-027**: Người dùng MUST quản lý được toàn bộ vòng đời kết nối: tạo, tạo từ URI, xem/sao chép URI, sửa, nhân bản, đóng, xoá, và xem danh sách quản lý kết nối.
- **FR-028**: Người dùng MUST kiểm soát được giao dịch khi sửa dữ liệu: bật/tắt tự động ghi, xác nhận, huỷ bỏ, và thấy trạng thái giao dịch hiện tại.
- **FR-029**: Người dùng MUST huỷ được truy vấn đang chạy, và truy vấn MUST thực sự dừng ở phía server.
- **FR-030**: Người dùng MUST xem và thay đổi được người dùng, vai trò và quyền trên các engine hỗ trợ, với dữ liệu thật từ server.
- **FR-031**: Người dùng MUST thực hiện được DDL cho view và routine (tạo, sửa, xoá) và các thao tác bảo trì đối tượng, mỗi thao tác qua bước xem trước câu lệnh.
- **FR-032**: Người dùng MUST sao lưu và phục hồi được database, với kết quả kiểm chứng được bằng cách truy vấn lại dữ liệu sau phục hồi.
- **FR-033**: Người dùng MUST nhập dữ liệu từ tệp vào một bảng và xuất dữ liệu từ một bảng hoặc kết quả truy vấn ra tệp (luồng L-5), qua luồng có các bước rõ ràng, với ánh xạ cột, tiến độ và báo cáo kết quả quan sát được. *(So sánh và đồng bộ giữa hai nguồn thuộc US5 — xem FR-038, FR-039.)*
- **FR-034**: Các định dạng tệp cho nhập/xuất MUST bao gồm ít nhất một định dạng văn bản phân tách và một định dạng bảng tính; định dạng nào không hỗ trợ cho loại đối tượng hiện tại MUST vô hiệu hoá kèm lý do.
- **FR-035**: Thiết lập của người dùng MUST được lưu bền và MUST còn nguyên sau khi khởi động lại ứng dụng.
- **FR-036**: Các tác vụ chạy lâu MUST hiển thị tiến độ, cho phép huỷ, và ghi lại lịch sử chạy có thể xem lại.

### Functional Requirements — Bộ công cụ di trú dữ liệu (US5)

- **FR-037**: Người dùng MUST chuyển được đối tượng và dữ liệu giữa hai kết nối (Data Transfer), chọn được tập đối tượng và chế độ chuyển, với tiến độ và kết quả quan sát được.
- **FR-038**: Người dùng MUST so sánh và đồng bộ được **dữ liệu** giữa hai nguồn, xem được danh sách khác biệt theo từng dòng, và chọn được tập câu lệnh đồng bộ để xem trước rồi chạy.
- **FR-039**: Người dùng MUST so sánh và đồng bộ được **cấu trúc** giữa hai nguồn, xem được danh sách khác biệt theo từng đối tượng, và chọn được tập câu lệnh đồng bộ để xem trước rồi chạy.
- **FR-040**: Người dùng MUST kết xuất được database hoặc tập đối tượng ra tệp SQL, và MUST chạy được một tệp SQL vào một kết nối, với tiến độ và báo cáo lỗi theo từng câu lệnh.
- **FR-041**: Bốn công cụ ở FR-037…FR-040 MUST tuân thủ gating theo năng lực engine (FR-010…FR-016) và MUST cho phép huỷ giữa tiến trình mà không để trạng thái đích dở dang không giải thích được.

### Functional Requirements — Hàng đợi chức năng còn lại (US6)

- **FR-042**: Dự án MUST duy trì một bảng đối chiếu chức năng với công cụ tham chiếu, trong đó mỗi hạng mục có trạng thái: đã có / trong hàng đợi (kèm mức ưu tiên) / tuyên bố ngoài phạm vi (kèm lý do).
- **FR-043**: Mỗi chức năng bổ sung trong tương lai MUST tuân thủ FR-010…FR-016 (gating) và FR-017…FR-025 (kiểm thử) như mọi chức năng khác.

### Security Requirements

- **SR-001**: Mọi tham số người dùng nhập đi vào tầng dưới MUST được xác thực theo lược đồ đã khai báo.
- **SR-002**: Thông điệp lỗi hiển thị cho người dùng MUST NOT chứa vết ngăn xếp, đường dẫn nội bộ, chuỗi kết nối đầy đủ hay mật khẩu; nguyên nhân gốc MUST được ghi lại ở nơi chỉ người vận hành đọc được.
- **SR-003**: Mọi thao tác ghi vào database MUST đi qua bước xem trước câu lệnh trước khi thực thi, theo luật đã có của dự án.
- **SR-004**: Các thao tác liên quan tới an toàn (mở kết nối, thay đổi quyền, xoá đối tượng, xoá dữ liệu, chạy tác vụ ghi) MUST được ghi nhật ký.
- **SR-005**: Thông tin đăng nhập dùng cho môi trường phát triển và kiểm thử MUST chỉ dành cho môi trường cục bộ, có tài liệu công khai, và MUST NOT được dùng làm giá trị mặc định cho kết nối tới môi trường khác.
- **SR-006**: Khả năng cho phép nhiều câu lệnh trong một lần thực thi MUST chỉ áp dụng cho phiên của trình soạn truy vấn, MUST NOT áp dụng cho các thao tác duyệt/sửa dữ liệu.
- **SR-007**: Bộ kiểm thử MUST chỉ thao tác trên các database dành riêng cho kiểm thử; MUST NOT có khả năng tác động lên database không thuộc môi trường kiểm thử.

**Data Classification**:

| Data | Classification | Handling |
|------|---------------|----------|
| Mật khẩu kết nối DB | Confidential | Lưu trong kho bí mật của hệ điều hành; không bao giờ ghi nhật ký; không bao giờ hiển thị lại dạng rõ |
| Khoá riêng và cụm mật khẩu SSH/SSL | Confidential | Chỉ lưu đường dẫn tới tệp; nội dung không đi qua tầng giao diện |
| Chuỗi URI kết nối | Confidential | Che phần thông tin đăng nhập khi hiển thị và khi sao chép ra ngoài; không ghi nhật ký nguyên vẹn |
| Host, port, tên người dùng, tên database | Internal | Hiển thị được trong giao diện; ghi nhật ký được |
| Dữ liệu hàng trong bảng người dùng mở | Internal | Chỉ giữ trong phiên; không ghi ra nhật ký |
| Câu lệnh trong lịch sử truy vấn | Internal | Lưu cục bộ theo hồ sơ người dùng; cho phép xoá |
| Thông tin đăng nhập DB phát triển trên container | Public | Ghi rõ trong tài liệu; chỉ dùng cho môi trường cục bộ |

### Key Entities

- **Ngữ cảnh hoạt động**: mô tả "người dùng đang làm việc ở đâu" — kết nối, database, schema, đối tượng, loại đối tượng — cùng với năng lực và phiên bản của server tương ứng. Là nguồn sự thật duy nhất cho hiển thị và cho quyết định khả dụng của lệnh.
- **Lệnh giao diện**: một hành động người dùng có thể gọi. Có nhãn (qua hệ đa ngôn ngữ), hành động, tập điều kiện khả dụng, **tập bề mặt** nơi nó xuất hiện, và **số lượng đối tượng** nó nhận (một hay một tập). Là đơn vị được kiểm kê ở FR-025.
- **Bề mặt lệnh**: một vùng giao diện có thể phát ra lệnh — thanh công cụ, thanh menu, thanh đối tượng, bảng lệnh, và 11 bề mặt context menu S-01…S-11. Mỗi bề mặt context menu có tập **mục tiêu nhấp phải** riêng (loại node, ô, tiêu đề dòng/cột, vùng trống, …) quyết định lệnh nào hiện ra.
- **Bộ năng lực engine**: mô tả những gì một server cụ thể làm được — cấu trúc phân cấp, các loại đối tượng, cú pháp, khả năng thực thi. Đọc từ server lúc kết nối.
- **Bộ dữ liệu seed**: tập đối tượng và dữ liệu được nạp vào từng database container, đóng vai trò "sự thật kỳ vọng" cho bộ kiểm thử UI.
- **Kịch bản kiểm thử UI**: một luồng thao tác qua giao diện, gắn với một engine và một bộ seed, kèm các khẳng định suy ra từ trạng thái DB thật.
- **Bảng đối chiếu chức năng**: danh mục chức năng của công cụ tham chiếu kèm trạng thái tương ứng trong sản phẩm.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% các vùng giao diện hiển thị thông tin về đối tượng đang mở phản ánh đúng kết nối/database/đối tượng thật; số chuỗi cố định mô tả kết nối, database, engine hay phiên bản còn lại trong mã sản phẩm bằng 0.
- **SC-002**: 100% lệnh trên giao diện có tập điều kiện khả dụng được khai báo, và trạng thái khả dụng khớp với bảng năng lực engine trên toàn bộ 7 engine được hỗ trợ.
- **SC-003**: Số lệnh trên giao diện không có hành động, hoặc dẫn tới hành động không phân biệt được với lệnh khác, bằng 0.
- **SC-004**: Người dùng mở được kết nối tới từng engine và duyệt tới một bảng trong vòng dưới 30 giây, không gặp thông điệp lỗi nào ở luồng thành công.
- **SC-005**: Khi mở kết nối thất bại, người dùng đọc được nguyên nhân và tự phục hồi trong ứng dụng (không khởi động lại) trong 100% trường hợp thử.
- **SC-006**: Tầng kiểm thử rộng phủ toàn bộ 7 engine được hỗ trợ và toàn bộ các luồng nêu ở FR-023; tầng kiểm thử sâu phủ 6/6 luồng cốt lõi L-1…L-6 trên ít nhất 2 engine khác đặc tính phân cấp.
- **SC-007**: Bộ kiểm thử UI phát hiện được toàn bộ các khiếm khuyết đã ghi ở mục B.2 và B.3 khi chạy trên trạng thái mã trước khi sửa (tính chất "test thất bại trước, xanh sau").
- **SC-008**: Cổng chất lượng của dự án chặn được 100% các hồi quy thuộc loại "mất đường dây lệnh" và "hiển thị sai ngữ cảnh" trong bộ kịch bản đã định nghĩa.
- **SC-009**: Bộ kiểm thử UI chạy hai lần liên tiếp cho kết quả giống nhau trong 100% lần thử.
- **SC-010**: Tỉ lệ các năng lực phía sau có đường vào từ giao diện đạt **76/76 (100%)** — từ mức 30/76 hiện tại. Không có nhóm nào được hoãn.
- **SC-011**: Mỗi hạng mục trong bảng đối chiếu chức năng có một trạng thái dứt khoát; số hạng mục không có trạng thái bằng 0.
- **SC-012**: Không có thông điệp lỗi nào hiển thị cho người dùng chứa vết ngăn xếp, đường dẫn nội bộ hay thông tin đăng nhập, trên toàn bộ bộ kịch bản kiểm thử.
- **SC-013**: Cả 4 công cụ di trú dữ liệu (Data Transfer, Data Sync, Structure Sync, Dump/Execute SQL) chạy được đầu-cuối trên DB Docker thật, với kết quả xác nhận bằng cách truy vấn lại cả nguồn và đích.
- **SC-014**: Cả 6 luồng cốt lõi L-1…L-6 chạy được đầu-cuối trên ứng dụng thật mà người dùng không gặp thông điệp lỗi nào ở luồng thành công.
- **SC-015**: Cả 11 bề mặt S-01…S-11 mở được context menu bằng **cả** chuột và bàn phím; số bề mặt không phản hồi nhấp phải bằng 0 (hiện tại: 11/11 không phản hồi).
- **SC-016**: Với mỗi lệnh, tập bề mặt thực tế nó xuất hiện khớp 100% với tập bề mặt đã khai báo ở FR-010; số lệnh thiếu ở một bề mặt đã khai báo bằng 0.

---

## Assumptions

- **A-01**: Phạm vi engine là 7 engine đã có driver và đã có seed container trong dự án: PostgreSQL, MySQL/MariaDB, SQLite, SQL Server, Oracle, MongoDB, Redis. Bộ kiểm thử UI phủ cả 7.
- **A-02**: Hạ tầng container và seed hiện có (`docker/dev-db/` cùng bộ lệnh quản lý DB của dự án) là nền tảng được tái sử dụng, không dựng lại từ đầu; nếu seed thiếu loại đối tượng nào theo FR-019 thì bổ sung vào bộ seed đó.
- **A-03**: Trên các bề mặt **tĩnh** (thanh công cụ, thanh menu, thanh đối tượng), lệnh không khả dụng được **vô hiệu hoá kèm lý do**, không bị ẩn đi — để người dùng học được vì sao, thay vì thấy giao diện thay đổi hình dạng giữa các engine. Hai ngoại lệ: (a) các **nhóm loại đối tượng** mà engine không có thì không xuất hiện trên cây (ẩn), vì hiện một nhóm rỗng là nhiễu; (b) trong **context menu**, lệnh mà engine không hỗ trợ thì ẩn — xem FR-046B để biết lý do của khác biệt này.
- **A-04**: Quy tắc "mọi thao tác ghi phải đi qua xem trước câu lệnh" là luật đã có của dự án và tiếp tục áp dụng cho toàn bộ chức năng mới.
- **A-05**: Bộ năng lực engine được đọc từ server lúc kết nối (không suy ra từ tên driver), phù hợp với ghi chú trong bảng năng lực của dự án về các thuộc tính phụ thuộc cấu hình server.
- **A-06**: Bộ kiểm thử UI chạy trên môi trường phát triển cục bộ và trên môi trường tích hợp liên tục có Docker; nếu môi trường không có Docker thì bộ kiểm thử báo bỏ qua một cách tường minh, không âm thầm xanh.
- **A-07**: Bộ dữ liệu rất lớn (mức 1 triệu dòng) chỉ nạp theo yêu cầu, không nằm trong luồng kiểm thử mặc định, để giữ thời gian chạy hợp lý.
- **A-08**: Tài liệu Navicat được dùng làm **tham chiếu chức năng và luồng nghiệp vụ**, không phải mục tiêu sao chép giao diện; hệ thiết kế hiện có của dự án được giữ nguyên.
- **A-09**: Mọi thay đổi nằm ở tầng giao diện và tầng kiểm thử; giao diện lập trình giữa các tầng chỉ mở rộng khi thực sự cần và không phá vỡ tương thích.

## Dependencies

- **D-01**: Môi trường container database của dự án phải chạy được để phát triển và kiểm thử các mục US1–US4.
- **D-02**: Bảng năng lực engine của dự án là nguồn đối chiếu cho gating; nếu phát hiện sai lệch giữa bảng và giá trị thực thi trong driver thì phải xử lý sai lệch đó trước.
- **D-03**: Kết quả của hai đặc tả trước (điều hướng đa engine, môi trường DB thật trên Docker) là nền móng; tính năng này xây trên đó chứ không làm lại.
- **D-04**: Cần một công cụ điều khiển giao diện thật cho tầng kiểm thử UI; hiện dự án khai báo một lệnh kiểm thử E2E nhưng chưa có công cụ nào được cài (mục C-16) — việc chọn công cụ thuộc giai đoạn lập kế hoạch.

## Out of Scope

- Thay đổi hệ thiết kế, bố cục hay bảng màu của giao diện hiện có.
- Thay đổi kiến trúc phân tầng hoặc thay thế các driver hiện có.
- Bổ sung engine mới ngoài 7 engine đã có driver.
- Các chức năng cộng tác trên đám mây (đồng bộ kết nối, dự án chia sẻ, thành viên) của công cụ tham chiếu.
- Các khoảng trống chức năng ở US6 (Data Profiling, Debugger, Pub/Sub, Aggregation Pipeline, Data Generation, Data Dictionary, BI, Reverse/Forward Engineering, Find in Database, Console, Share via URI, Favorites, Detail view, Schema Analysis) — chỉ lập hàng đợi có ưu tiên, không triển khai trong tính năng này.

## Clarifications

### Phiên 2026-08-24

| # | Câu hỏi | Quyết định | Ảnh hưởng |
|---|---|---|---|
| Q1 | Mức độ kiểm thử UI | **Hai tầng**: tầng rộng phủ cả 7 engine bằng cách dựng giao diện trong môi trường kiểm thử với tầng dưới thật; tầng sâu điều khiển ứng dụng thật đầu-cuối cho **Luồng cốt lõi** trên 2–3 engine | FR-017, FR-017B, FR-023, SC-006 |
| Q2 | Ngưỡng nghiệm thu US4 | **100%** — toàn bộ 46 năng lực phía sau còn treo phải có đường vào từ giao diện trong tính năng này | FR-026, SC-010 |
| Q3 | Phạm vi US5 | **Bổ sung 4 chức năng ưu tiên cao nhất** thuộc bộ công cụ di trú dữ liệu: Data Transfer, Data Synchronization, Structure Synchronization, Dump/Execute SQL File. Các khoảng trống còn lại chỉ vào hàng đợi có ưu tiên | US5, FR-037, FR-038, SC-011, SC-013 |

- Q: Menu chuột phải (context menu) cần có trên những bề mặt nào? → A: **Toàn bộ 11 bề mặt** — ba bề mặt cốt lõi, các vùng soạn thảo/canvas, và các bề mặt phụ (tab bar, thanh công cụ, thư viện snippet, danh sách job, khung so sánh diff).
- Q: Context menu là user story riêng hay tiêu chí của từng lệnh? → A: **Không tách story.** Context menu là **tiêu chí Definition-of-Done của từng lệnh**: lệnh nào hoàn thiện trong US1–US5 thì phải xuất hiện trên các bề mặt context menu tương ứng ngay tại thời điểm đó. Ràng buộc gắn vào FR-010, kiểm kê mở rộng ở FR-025.
- Q: Trong context menu, lệnh không khả dụng thì ẩn hay vô hiệu hoá? → A: **Theo lý do.** Ẩn khi engine không hỗ trợ (vĩnh viễn không dùng được ở kết nối này); vô hiệu hoá kèm lý do khi ngữ cảnh chưa đủ (thiếu quyền / sai loại đối tượng / chưa chọn gì) — tức các lý do người dùng có thể tự khắc phục.
- Q: Context menu có tác động lên nhiều đối tượng đã chọn không? → A: **Có, nhưng chỉ cho một tập lệnh khai báo rõ** — Maintain Objects, Drop, Export, và chọn đối tượng cho Data Transfer / Import-Export. Các lệnh còn lại vẫn tác động lên một đối tượng, và khi đang chọn nhiều thì vô hiệu hoá kèm lý do "chỉ áp dụng cho một đối tượng".
- Q: Context menu có mở được bằng bàn phím không? → A: **Có, trên cả 11 bề mặt** — phím Menu và `Shift+F10` để mở, phím mũi tên để điều hướng, Enter để chọn, Escape để đóng, tiêu điểm trở lại đúng nơi vừa mở menu. Mức ARIA đầy đủ cho trình đọc màn hình **không** thuộc phạm vi tính năng này.

#### Kiểm kê bề mặt context menu *(nguồn: đối chiếu 321 chỗ nhắc right-click / pop-up menu trong Navicat User Guide)*

| # | Bề mặt | Mục tiêu nhấp phải | Nhóm |
|---|---|---|---|
| S-01 | Cây điều hướng | connection · database · schema · nhóm loại đối tượng · đối tượng · sub-element (field / index / foreign key) | cốt lõi |
| S-02 | Danh sách đối tượng | một đối tượng · nhiều đối tượng đã chọn · vùng trống | cốt lõi |
| S-03 | Lưới dữ liệu | ô · tiêu đề dòng · tiêu đề cột · vùng trống | cốt lõi |
| S-04 | Trình soạn SQL | vùng văn bản đã chọn · vùng trống | soạn thảo |
| S-05 | Canvas Query Builder | đối tượng · đường join · vùng trống | soạn thảo |
| S-06 | Canvas ER Diagram | bảng · đường quan hệ · vùng trống | soạn thảo |
| S-07 | Tab bar | một tab | phụ |
| S-08 | Thanh công cụ | chính thanh công cụ (đổi cỡ icon, hiện/ẩn nhãn) | phụ |
| S-09 | Thư viện snippet | một snippet · vùng trống | phụ |
| S-10 | Danh sách job / hàng đợi | một item · toàn danh sách (tạm dừng / tiếp tục / dừng / xoá mục đã xong) | phụ |
| S-11 | Khung so sánh diff | khung (bật/tắt hiển thị khác biệt) | phụ |

Các bề mặt thuộc chức năng đã hoãn sang US6 (Debugger, Pub/Sub, Aggregation Pipeline, BI/Chart) **không** thuộc phạm vi; khi các chức năng đó được triển khai, context menu của chúng đi kèm theo FR-043.

### Luồng cốt lõi *(do người dùng chỉ định — mục tiêu cao nhất của tính năng)*

Thứ tự dưới đây là **thứ tự ưu tiên tuyệt đối**. Đây cũng chính là phạm vi của tầng kiểm thử sâu (FR-017B) và là thứ tự nghiệm thu từng phần:

| # | Luồng | Trạng thái hiện tại | Story |
|---|---|---|---|
| L-1 | Kết nối được tới DB và mở kết nối không lỗi | Lỗi (C-14), chrome nói sai (C-06/C-07) | US1 |
| L-2 | Viết được SQL trong trình soạn truy vấn | Có, nhưng thiếu huỷ truy vấn | US1 + US4 |
| L-3 | Chạy và thực thi được truy vấn, xem kết quả | Có | US1 + US4 |
| L-4 | Sửa được dữ liệu (kèm giao dịch: xác nhận / huỷ bỏ) | Có sửa; `tx.*` chưa có đường vào UI (C-02) | US4 |
| L-5 | Nhập / xuất dữ liệu | Không tồn tại — menu chỉ mở tab Automation (C-11) | US4 |
| L-6 | Bộ công cụ trong menu Tools: Data Transfer, Data Sync, Structure Sync, Dump/Execute SQL | Không tồn tại; `CompareView` là màn hình tĩnh (C-03) | US5 |

Mọi luồng khác chỉ được coi là hoàn tất **sau khi** L-1…L-6 đã xanh trên bộ kiểm thử.
