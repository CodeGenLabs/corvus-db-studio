# Feature Specification: Môi trường DB thật trên Docker & loại bỏ mockup

**Feature Branch**: `002-docker-real-env-testing`
**Created**: 2026-08-21
**Status**: Draft
**Input**: User description: "kiểm tra lại toàn bộ source code — lên kế hoạch run tất cả các loại db trên docker, liệt kê tất cả kết nối vào file readme (hiện tại docker của tôi đã có sql server ở port 1433, vui lòng tạo db mới ở port 1434) — sử dụng tất cả các tính năng đều phải dựa trên môi trường thực tế thay vì mockup như hiện tại — về phương thức test ở local, tôi cũng muốn bạn kiểm tra bằng cách sử dụng data test trên db ở docker"

---

## Bối cảnh: kết quả rà soát mã nguồn hiện tại

Rà soát ngày 2026-08-21 trên nhánh `main` (30e73a5). Đây là **hiện trạng đã kiểm chứng**, làm cơ sở cho các yêu cầu bên dưới.

| # | Phát hiện | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| A-01 | UI mặc định rơi về mock transport khi không được truyền transport | `packages/ui/src/store/studio.tsx:80` → `transport ?? createMockTransport()` | Chạy `pnpm dev` (`src/App.tsx` → `CorvusApp` không transport) cho ra một app **trông như hoạt động** nhưng toàn bộ dữ liệu là giả |
| A-02 | Dữ liệu schema trong UI là fixture Sakila của package mock | `packages/ui/src/data/schema.ts` = 1 dòng re-export `@corvus/transport-mock/fixtures/sakila` | Mã production của `packages/ui` phụ thuộc trực tiếp vào package mock |
| A-03 | Không có stack Docker cho database phát triển | `docker-compose.yml` chỉ có service `corvus-studio` (app, port 3000) | Không có cách nào bật 7 engine để dùng thật ở local |
| A-04 | README không có bảng thông tin kết nối | `README.md` chỉ ghi "Docker *(tuỳ chọn)*" cho `pnpm test:it` | Người mới không biết kết nối vào đâu, bằng credential nào |
| A-05 | Integration test dùng testcontainers dựng container tạm mỗi lần chạy | `packages/driver-{postgres,mysql,mssql,oracle}/src/*.integration.test.ts`, `packages/engine/src/__tests__/*.integration.test.ts` | Chậm (hookTimeout 300s), tốn băng thông pull image, và **không dùng bộ dữ liệu test có sẵn** |
| A-06 | MongoDB và Redis **không có** integration test nào | `packages/driver-mongodb/src/__tests__/`, `packages/driver-redis/src/__tests__/` chỉ có `capabilities/errors/value.test.ts` (unit) | 2 trong 7 engine chưa từng được kiểm chứng trên server thật |
| A-07 | Conformance dialect chỉ có 5/7 engine | `packages/driver-core/src/conformance/dialect.ts`: `POSTGRES_`, `SQLITE_`, `MYSQL_`, `MSSQL_`, `ORACLE_CONFORMANCE` | Không có định nghĩa conformance cho MongoDB / Redis |
| A-08 | `mariadb` là DriverId hợp lệ nhưng không có engine để thử | `packages/contract/src/uri.ts:12` khai báo `mariadb`, không có container/test nào | Nhánh MariaDB của driver MySQL chưa được kiểm chứng |
| A-09 | Xung đột cổng với môi trường sẵn có của người dùng | Máy người dùng đã có SQL Server ở `1433`; mã nguồn mặc định `defaultPort = 1433` (`packages/driver-mssql/src/driver.ts:291`) | Stack mới phải dùng cổng khác để không đụng instance đang chạy |
| A-10 | CI integration chỉ pull image PostgreSQL | `.github/workflows/integration.yml:39` → `docker pull postgres:16-alpine` | 6 engine còn lại không được chạy tự động trên CI |
| A-11 | **Bản desktop dùng mock transport làm backend RPC** | `apps/desktop/main/src/index.ts:5,9` — `createMockTransport({latencyMs:0})` được nối thành `mockRouter` cho `IpcRpcHost` | `pnpm dev:desktop` **và bản desktop đóng gói** hoàn toàn là dữ liệu giả. Đúng món nợ đã sửa ở phía web (`apps/web/server/src/engine.ts` §21 ghi lại) nhưng chưa sửa ở desktop |
| A-12 | Fixture mock lan ra **8 file mã production** của UI và bị **re-export ra API công khai** | `packages/ui/src/index.ts:10` → `export * from './data/schema'`. Nơi dùng: `UsersDialog`, `FilterPanel`, `InfoPane`, `store/shell.ts`, `BackupView`, `CompareView`, `DataView`, `ObjectsView` | Phạm vi bỏ mock lớn hơn A-02 nhiều. `DataView.tsx:78,101` còn có 2 chỗ "fallback sang mock data" khi kết nối không trả dữ liệu — đúng hành vi FR-014 cấm |

**Kết luận rà soát**: mã nguồn 7 driver đã có kết nối thật (`pg`, `mysql2`, `better-sqlite3`, `mssql`, `oracledb`, `mongodb`, `ioredis`) — vấn đề **không phải** driver giả, mà là **đường mặc định của ứng dụng và của bộ test dẫn tới dữ liệu giả / container tạm** thay vì một môi trường thật, ổn định, có dữ liệu mẫu.

---

## Clarifications

### Session 2026-08-21

- Q: `pnpm dev` (UI shell mock) trở thành gì khi bỏ mock khỏi đường mặc định? → A: `pnpm dev` nối engine thật qua web server + stack Docker; mock tách thành lệnh riêng `dev:mock` kèm banner cảnh báo trên UI
- Q: Bảng "đủ lớn" trong bộ dữ liệu mẫu là bao nhiêu dòng? → A: Hai bảng — một ~100.000 dòng seed mặc định, một ~1.000.000 dòng sinh theo yêu cầu bằng lệnh riêng
- Q: Test cách ly dữ liệu thế nào khi chạy trên môi trường dùng chung? → A: Mỗi lần chạy tạo schema/database riêng mang định danh ngẫu nhiên, drop khi xong; dữ liệu mẫu là chỉ đọc
- Q: Engine nào chạy tự động mỗi PR, engine nào chạy theo lịch? → A: Mỗi PR: PostgreSQL, MySQL, SQLite, Redis, MongoDB. Theo lịch: SQL Server, Oracle, MariaDB
- Q: MariaDB dùng cổng nào để không đụng MySQL ở 3306? → A: 3307. Bảng cổng chốt: PostgreSQL 5432, MySQL 3306, MariaDB 3307, SQL Server 1434, Oracle 1521, MongoDB 27017, Redis 6379

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Bật toàn bộ engine database bằng một lệnh (Priority: P1)

Một người phát triển vừa clone repo. Họ chạy một lệnh duy nhất và có ngay tất cả engine database mà sản phẩm hỗ trợ, đang chạy ở local, mỗi engine đã nạp sẵn một bộ dữ liệu mẫu giống nhau về ý nghĩa. Họ đọc README và thấy đầy đủ host / cổng / tên database / tài khoản của từng engine.

**Why this priority**: Đây là nền của mọi phần còn lại. Không có môi trường thật thì không thể bỏ mock, cũng không thể test bằng dữ liệu thật.

**Independent Test**: Chạy lệnh khởi động stack trên máy sạch, sau đó kết nối tới từng engine bằng đúng thông tin ghi trong README và truy vấn được bảng dữ liệu mẫu. Hoàn tất mà không cần bất kỳ phần nào của các story sau.

**Acceptance Scenarios**:

1. **Given** máy có Docker và một SQL Server đang chiếm cổng 1433, **When** khởi động stack database của dự án, **Then** mọi engine lên trạng thái khoẻ và **không** engine nào chiếm cổng 1433 — SQL Server của dự án phục vụ ở 1434.
2. **Given** stack đã chạy, **When** người dùng mở README, **Then** họ thấy một bảng liệt kê **mọi** kết nối (engine, phiên bản, host, cổng, database/namespace, user, mật khẩu, connection string mẫu) và làm theo được mà không cần hỏi ai.
3. **Given** stack vừa được khởi tạo lần đầu, **When** kiểm tra từng engine, **Then** mỗi engine đã có sẵn bộ dữ liệu mẫu (bảng/collection/key có hàng dữ liệu), không cần bước nạp tay.
4. **Given** stack đang chạy, **When** dừng rồi khởi động lại, **Then** dữ liệu mẫu và mọi thay đổi của người dùng vẫn còn (dữ liệu bền vững).
5. **Given** stack đang chạy, **When** người dùng yêu cầu đặt lại môi trường, **Then** toàn bộ dữ liệu trở về đúng trạng thái mẫu ban đầu.

---

### User Story 2 — Ứng dụng luôn nói chuyện với database thật (Priority: P1)

Người phát triển chạy ứng dụng ở chế độ phát triển. Mọi thứ họ thấy — danh sách kết nối, cây schema, dữ liệu bảng, kết quả truy vấn, ER diagram, monitor, jobs — đến từ database thật trong stack Docker. Không có bất kỳ màn hình nào hiển thị dữ liệu bịa.

**Why this priority**: Đây là yêu cầu trọng tâm của người dùng. Dữ liệu giả trong đường chạy mặc định làm ẩn lỗi và tạo cảm giác sai về mức độ hoàn thành (chính lỗi đã ghi trong `docs/04-plan/audit-2026-08-18.md`).

**Independent Test**: Khởi động ứng dụng ở chế độ phát triển với stack Docker đang chạy, tạo kết nối tới từng engine, và xác nhận mọi giá trị hiển thị khớp với dữ liệu thật trong database (thay đổi dữ liệu ở phía database phải thấy được ở UI sau khi refresh).

**Acceptance Scenarios**:

1. **Given** stack Docker đang chạy, **When** người dùng chạy ứng dụng ở chế độ phát triển, **Then** ứng dụng nối vào engine thật; không màn hình nào lấy dữ liệu từ fixture dựng sẵn.
2. **Given** không có backend nào chạy được, **When** người dùng mở ứng dụng, **Then** ứng dụng báo lỗi kết nối rõ ràng và **không** âm thầm rơi về dữ liệu giả.
3. **Given** một tính năng chưa được driver của engine đó hỗ trợ, **When** người dùng gọi tính năng đó, **Then** hệ thống trả lỗi "chưa hỗ trợ" tường minh chứ không trả dữ liệu bù.
4. **Given** người dùng sửa một hàng trực tiếp trong database bằng công cụ khác, **When** họ refresh trong ứng dụng, **Then** thấy đúng giá trị mới.
5. **Given** vẫn cần môi trường mock cho việc phát triển giao diện thuần, **When** người phát triển chạy **lệnh mock riêng** (không phải lệnh mặc định), **Then** ứng dụng lên với dữ liệu giả và giao diện hiện dấu hiệu thường trực cho biết đang ở chế độ mock.
6. **Given** người phát triển chạy **lệnh phát triển mặc định**, **When** ứng dụng khởi động, **Then** nó nối vào stack Docker qua backend thật — không có cách nào từ lệnh này chạm tới dữ liệu giả.

---

### User Story 3 — Test ở local chạy trên dữ liệu test trong Docker (Priority: P1)

Người phát triển muốn kiểm chứng công việc của mình. Họ chạy bộ test tích hợp và nó dùng **stack Docker đang chạy cùng bộ dữ liệu mẫu** thay vì dựng container tạm. Test nhanh hơn, lặp lại được, và khi thất bại họ có thể tự tay mở đúng database đó để xem chuyện gì xảy ra.

**Why this priority**: Người dùng yêu cầu trực tiếp. Đồng thời đây là điều kiện để tin được các tuyên bố "đã xong".

**Independent Test**: Với stack đang chạy, chạy bộ test tích hợp hai lần liên tiếp — cả hai lần đều xanh (test tự dọn dẹp, không phụ thuộc thứ tự), và tổng thời gian giảm đáng kể so với cách dựng container tạm.

**Acceptance Scenarios**:

1. **Given** stack Docker đang chạy, **When** chạy bộ test tích hợp ở local, **Then** test nối vào stack đó, dùng bộ dữ liệu mẫu, và không kéo/khởi tạo container mới.
2. **Given** stack Docker **không** chạy, **When** chạy bộ test tích hợp, **Then** test dừng ngay với thông báo nêu rõ cần khởi động stack và chỉ đúng lệnh — không treo, không báo xanh giả.
3. **Given** bộ test đã chạy xong, **When** kiểm tra dữ liệu mẫu, **Then** dữ liệu vẫn ở trạng thái ban đầu (mọi thứ test tạo ra đều nằm trong không gian riêng và được dọn).
4. **Given** hai bộ test chạy song song, **When** cả hai chạm cùng engine, **Then** chúng không phá nhau (mỗi lần chạy có không gian tên riêng).
5. **Given** một engine chưa có bộ test tích hợp (MongoDB, Redis theo A-06), **When** bộ test hoàn tất, **Then** engine đó đã có test tích hợp trên server thật, hoặc được báo cáo tường minh là "bỏ qua kèm lý do" chứ không im lặng.
6. **Given** người dùng chạy lệnh kiểm chứng đầy đủ, **When** lệnh hoàn tất, **Then** kết quả nêu rõ engine nào đã được kiểm chứng thật, engine nào bị bỏ qua và vì sao.

---

### User Story 4 — Bảng thông tin kết nối là nguồn sự thật duy nhất (Priority: P2)

Người dùng cần biết chính xác cách nối vào mỗi engine, không phải đi đọc file cấu hình. README chứa một bảng đầy đủ và bảng đó không được phép lệch với cấu hình thật.

**Why this priority**: Người dùng yêu cầu trực tiếp; đồng thời tài liệu lệch thực tế còn tệ hơn không có tài liệu, nên cần cơ chế chống lệch.

**Independent Test**: So bảng trong README với cấu hình stack thật — mọi cổng, tên database, tài khoản khớp 100%. Đổi một cổng trong cấu hình mà không cập nhật README phải bị phát hiện.

**Acceptance Scenarios**:

1. **Given** cấu hình stack, **When** đối chiếu với bảng trong README, **Then** không có sai lệch nào về cổng / database / user.
2. **Given** ai đó đổi một cổng trong cấu hình nhưng quên sửa README, **When** chạy lệnh kiểm chứng, **Then** sai lệch bị phát hiện và báo lỗi.
3. **Given** người dùng đọc README, **When** họ copy một connection string mẫu, **Then** nó nối được ngay không cần sửa.

---

### User Story 5 — Kiểm chứng đầy đủ 7 engine trên môi trường thật (Priority: P3)

Toàn bộ 7 engine (kèm nhánh MariaDB) đều đi qua cùng một bộ kiểm tra tuân thủ trên server thật, và trạng thái này được ghi lại minh bạch.

**Why this priority**: Hoàn thiện độ phủ. Có giá trị nhưng phụ thuộc P1 đã xong; và một số engine (Oracle) tốn tài nguyên nên có thể chạy theo lịch thay vì mỗi lần.

**Independent Test**: Chạy bộ kiểm tra tuân thủ cho từng engine trên stack Docker và đối chiếu bảng trạng thái trong tài liệu — không có ô nào ghi "đã có" mà không kèm bằng chứng.

**Acceptance Scenarios**:

1. **Given** stack đang chạy, **When** chạy bộ kiểm tra tuân thủ cho từng engine, **Then** mỗi engine cho ra kết quả pass/skip tường minh theo từng nhóm kiểm tra.
2. **Given** một engine không hỗ trợ một nhóm kiểm tra, **When** nhóm đó bị bỏ qua, **Then** báo cáo ghi rõ lý do bỏ qua.
3. **Given** bảng hiện trạng engine trong tài liệu, **When** đối chiếu với kết quả chạy thật, **Then** mọi dòng đều khớp với output lệnh, không có dòng phỏng đoán.

---

### Edge Cases

- **Cổng đã bị chiếm**: một cổng của stack (ví dụ 5432 do PostgreSQL cài trực tiếp trên máy) đã bị chiếm → thông báo phải chỉ rõ engine nào, cổng nào, và cách đổi.
- **SQL Server 1433 của người dùng**: stack tuyệt đối không được nối vào, sửa, hay dừng instance ở 1433 (A-09).
- **Engine nặng**: Oracle mất vài phút mới khoẻ và tốn nhiều RAM → phải có cách bật một tập con engine, và cách chờ đúng trạng thái khoẻ trước khi test.
- **Máy yếu**: không đủ RAM cho toàn bộ engine → phải nêu rõ yêu cầu tài nguyên và cách chạy từng phần.
- **Lần đầu nạp dữ liệu**: nạp dữ liệu mẫu bị ngắt giữa đường → lần khởi động sau phải phát hiện trạng thái dở dang, không được coi là đã nạp xong.
- **Test bị hủy giữa đường**: dữ liệu tạm còn sót → lần chạy sau phải tự dọn tàn dư của lần trước.
- **Redis / MongoDB không có bảng**: khái niệm "dữ liệu mẫu" khác (key-space, collection) → bộ dữ liệu mẫu phải tương đương về ý nghĩa, không cố nhồi mô hình quan hệ.
- **Mật khẩu mẫu**: credential dùng cho stack local tuyệt đối không được dùng lại cho môi trường thật, và không được đưa vào ảnh Docker phát hành.
- **CI khác local**: CI có thể không chạy được stack đầy đủ (Oracle) → phải phân biệt rõ tập engine chạy mỗi PR và tập chạy theo lịch.

---

## Requirements *(mandatory)*

### Functional Requirements

**Nhóm 1 — Môi trường Docker (giải quyết A-03, A-08, A-09)**

- **FR-001**: Hệ thống MUST cung cấp một môi trường database chạy bằng container, khởi động và dừng bằng **một lệnh duy nhất** cho mỗi hướng.
- **FR-002**: Môi trường MUST bao gồm mọi engine sản phẩm hỗ trợ cần server: PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, MongoDB, Redis. SQLite là engine dạng tệp nên không cần container, nhưng MUST có tệp dữ liệu mẫu tương đương.
- **FR-003**: Môi trường MUST dùng đúng các cổng mặc định sau, và MUST không chiếm cổng nào ngoài danh sách này:

  | Engine | Cổng mặc định | Lý do |
  |---|---|---|
  | PostgreSQL | 5432 | cổng chuẩn của engine |
  | MySQL | 3306 | cổng chuẩn của engine |
  | MariaDB | **3307** | trùng họ MySQL nên phải lệch; 3307 là quy ước phổ biến cho instance thứ hai |
  | SQL Server | **1434** | 1433 đã thuộc instance của người dùng — tuyệt đối không chạm |
  | Oracle | 1521 | cổng chuẩn của engine |
  | MongoDB | 27017 | cổng chuẩn của engine |
  | Redis | 6379 | cổng chuẩn của engine |

- **FR-003a**: Môi trường MUST không kết nối, sửa đổi, hay dừng bất kỳ dịch vụ nào đang chạy ở cổng 1433.
- **FR-004**: Mỗi engine MUST có kiểm tra sức khoẻ (health check), và MUST có cách chờ tới khi toàn bộ engine sẵn sàng trước khi chạy test.
- **FR-005**: Người dùng MUST bật được **một tập con** engine (ví dụ chỉ PostgreSQL + MySQL) mà không cần bật engine nặng.
- **FR-006**: Dữ liệu MUST bền vững qua các lần khởi động lại, và MUST có lệnh đặt lại về trạng thái mẫu ban đầu.
- **FR-007**: Mọi cổng của môi trường MUST cấu hình được (biến môi trường) để tránh xung đột trên máy khác nhau, với giá trị mặc định ghi trong tài liệu.

**Nhóm 2 — Dữ liệu test (giải quyết A-05)**

- **FR-008**: Mỗi engine MUST được nạp tự động một bộ dữ liệu mẫu **ngay khi khởi tạo lần đầu**, không cần bước tay.
- **FR-009**: Bộ dữ liệu mẫu MUST tương đương về ý nghĩa giữa các engine (cùng thực thể, cùng quan hệ) để so sánh hành vi giữa engine là hợp lệ.
- **FR-010**: Bộ dữ liệu mẫu MUST phủ những chỗ dễ sai: kiểu dữ liệu đặc thù engine, giá trị NULL, dữ liệu nhị phân, Unicode, tên định danh có dấu cách/chữ hoa, khoá ngoại, index, view, stored routine, trigger — ở mức engine đó hỗ trợ.
- **FR-011**: Bộ dữ liệu mẫu MUST chứa một bảng khoảng **100.000 dòng**, được nạp ngay ở lần khởi tạo đầu, dùng để kiểm chứng phân trang và stream kết quả (khớp mốc stream 100k đã cam kết trong backlog).
- **FR-011a**: Hệ thống MUST cung cấp cách sinh **theo yêu cầu** một bảng khoảng **1.000.000 dòng** bằng một lệnh riêng; bảng này MUST không được nạp ở lần khởi tạo đầu, để thời gian khởi tạo và dung lượng lưu trữ mặc định không bị đội lên.
- **FR-011b**: Bảng 1.000.000 dòng MUST xoá được về trạng thái không tồn tại mà không phải khởi tạo lại toàn bộ môi trường.
- **FR-012**: Bộ dữ liệu mẫu MUST được nạp lại y hệt (idempotent, deterministic) — cùng script cho ra cùng dữ liệu.

**Nhóm 3 — Bỏ mockup khỏi đường chạy mặc định (giải quyết A-01, A-02)**

- **FR-013**: Lệnh phát triển **mặc định** MUST nối tới engine thật trong môi trường Docker; MUST không tồn tại đường mặc định nào dẫn tới dữ liệu giả.
- **FR-013a**: **Bản desktop** MUST dùng engine thật làm backend RPC, không dùng mock transport (khoả lấp A-11). Cả bản chạy phát triển và bản đóng gói MUST không chứa mock transport trong đường phục vụ.
- **FR-014**: Hệ thống MUST không âm thầm rơi về dữ liệu giả khi backend không sẵn sàng; MUST hiện lỗi kết nối tường minh. Mọi nhánh "fallback sang mock" trong tầng hiển thị MUST bị loại bỏ (A-12).
- **FR-015a**: API công khai của tầng giao diện MUST không re-export fixture mock (A-12).
- **FR-015**: Mã production của tầng giao diện MUST không phụ thuộc vào fixture của môi trường mock (xoá phụ thuộc ở A-02).
- **FR-016**: Chế độ mock MUST chỉ khởi động được qua **một lệnh phát triển riêng, tên gọi nêu rõ là mock**; MUST không đạt tới được từ lệnh mặc định.
- **FR-016a**: Khi đang ở chế độ mock, giao diện MUST hiện một dấu hiệu thường trực (không thể bỏ qua, không tự tắt) cho biết dữ liệu là giả.
- **FR-017**: Môi trường mock MUST vẫn dùng được cho unit test của tầng giao diện (không xoá `transport-mock`, chỉ chặn nó khỏi đường mặc định).
- **FR-018**: Khi một tính năng chưa được driver hỗ trợ, hệ thống MUST trả lỗi "chưa hỗ trợ" thay vì dữ liệu bù (giữ nguyên hợp đồng của `notImplemented`).

**Nhóm 4 — Test dựa trên môi trường thật (giải quyết A-05, A-06, A-07)**

- **FR-019**: Bộ test tích hợp MUST chạy được trên môi trường Docker đang có, dùng bộ dữ liệu mẫu, thay cho việc dựng container tạm mỗi lần chạy.
- **FR-020**: Nếu môi trường không sẵn sàng, bộ test tích hợp MUST thất bại nhanh với hướng dẫn cụ thể; MUST không báo xanh khi chưa kiểm chứng gì.
- **FR-021**: Mỗi lần chạy test MUST tạo một **không gian riêng của riêng lần chạy đó** (schema riêng ở engine có tầng schema; database/namespace riêng ở engine không có), mang định danh sinh ngẫu nhiên, và MUST xoá nó khi kết thúc.
- **FR-021a**: Bộ dữ liệu mẫu MUST được đối xử như **chỉ đọc** đối với test; test MUST không sửa hay xoá dữ liệu mẫu.
- **FR-021b**: Cơ chế cách ly MUST áp dụng được cho cả 7 engine, kể cả engine không có tầng schema và engine phi quan hệ; ánh xạ cho từng engine MUST được khai báo tường minh chứ không suy đoán tại chỗ.
- **FR-021c**: Khi một lần chạy bị hủy giữa đường và để lại không gian mồ côi, lần chạy sau MUST phát hiện và dọn tàn dư đó.
- **FR-022**: MongoDB và Redis MUST có bộ test tích hợp trên server thật (khoả lấp A-06).
- **FR-023**: Bộ kiểm tra tuân thủ (conformance) MUST bao phủ cả 7 engine, kèm định nghĩa cho MongoDB và Redis (khoả lấp A-07); nhóm kiểm tra bị bỏ qua MUST được báo cáo kèm lý do.
- **FR-024**: Kết quả kiểm chứng MUST nêu rõ engine nào đã chạy thật, engine nào bỏ qua và vì sao — không được để trạng thái mơ hồ.
- **FR-025**: Cấu hình chạy tự động (CI) MUST chạy test tích hợp trên **PostgreSQL, MySQL, SQLite, Redis, MongoDB** cho mọi thay đổi được đề xuất (mở rộng A-10 từ 1 lên 5 engine).
- **FR-025a**: CI MUST chạy test tích hợp trên **SQL Server, Oracle, MariaDB** theo lịch định kỳ, không chạy cho mọi thay đổi, do chi phí khởi động và tài nguyên.
- **FR-025b**: Kết quả CI MUST nêu rõ engine nào thuộc tập mỗi-PR và engine nào thuộc tập theo-lịch, kèm thời điểm lần chạy theo-lịch gần nhất và kết quả của nó — để không ai nhầm "CI xanh" thành "cả 7 engine đã xanh".
- **FR-025c**: Khi lần chạy theo-lịch thất bại, hệ thống MUST báo hiệu tường minh; MUST không để thất bại đó trôi qua trong im lặng chỉ vì CI mỗi-PR vẫn xanh.

**Nhóm 5 — Tài liệu (giải quyết A-04)**

- **FR-026**: README MUST chứa một bảng liệt kê **mọi** kết nối: engine, phiên bản, host, cổng, database/namespace, user, mật khẩu, connection string mẫu.
- **FR-027**: README MUST ghi rõ cách khởi động / dừng / đặt lại môi trường, yêu cầu tài nguyên tối thiểu, và cách xử lý xung đột cổng.
- **FR-028**: Bảng kết nối trong README MUST khớp với cấu hình thật, và sai lệch MUST bị lệnh kiểm chứng phát hiện (chống lệch tài liệu).
- **FR-029**: Tài liệu MUST ghi rõ credential của môi trường này chỉ dùng cho phát triển local và không được dùng lại ở nơi khác.

### Security Requirements

- **SR-001**: Credential của môi trường phát triển MUST tách hoàn toàn khỏi cấu hình môi trường thật, và MUST không xuất hiện trong ảnh Docker phát hành của sản phẩm.
- **SR-002**: Các cổng của môi trường MUST chỉ mở trên loopback theo mặc định, không phơi ra mạng LAN.
- **SR-003**: Hệ thống MUST không ghi mật khẩu / connection string chứa mật khẩu vào log hay báo cáo test (giữ nguyên hợp đồng redaction đã có).
- **SR-004**: Bộ dữ liệu mẫu MUST không chứa dữ liệu cá nhân thật; mọi dữ liệu MUST là dữ liệu bịa.
- **SR-005**: Bộ test tích hợp MUST không được chạy nhắm vào bất kỳ database nào ngoài môi trường phát triển đã khai báo; MUST có chốt an toàn chặn việc trỏ test vào host ngoài.

**Data Classification**:

| Data | Classification | Handling |
|---|---|---|
| Mật khẩu engine của môi trường local | Internal (dev-only) | Chỉ nằm trong cấu hình môi trường phát triển; redact khi log; không dùng lại ở nơi khác |
| Connection string trong README | Public (dev-only) | Chỉ trỏ tới loopback; kèm cảnh báo không dùng cho môi trường thật |
| Bộ dữ liệu mẫu | Public | Dữ liệu bịa hoàn toàn; không chứa dữ liệu cá nhân thật |
| Master key của vault ứng dụng | Confidential | Không bao giờ đặt giá trị mẫu dùng chung; không ghi log |

### Key Entities

- **Môi trường database phát triển**: tập engine chạy bằng container, mỗi engine có phiên bản, cổng, credential, trạng thái sức khoẻ và vòng đời (khởi động / dừng / đặt lại).
- **Bộ dữ liệu mẫu**: tập thực thể và quan hệ tương đương nhau trên mọi engine, dùng làm nền cho cả thao tác tay và test tự động.
- **Bảng kết nối**: bản mô tả duy nhất mọi thông tin kết nối, vừa dùng cho tài liệu vừa dùng để đối chiếu chống lệch.
- **Báo cáo kiểm chứng engine**: kết quả pass/skip theo từng engine và từng nhóm kiểm tra, kèm lý do khi bỏ qua.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trên máy sạch có Docker, người phát triển đi từ lúc clone tới lúc truy vấn được dữ liệu mẫu trên cả 7 engine trong **≤ 30 phút**, chỉ dùng README, **không cần hỏi thêm ai**.
- **SC-002**: **100%** engine trong môi trường lên trạng thái khoẻ sau khi khởi động, và **0** engine chiếm cổng 1433.
- **SC-003**: **100%** dòng trong bảng kết nối của README nối được thành công bằng đúng thông tin ghi trong đó, không cần sửa.
- **SC-004**: **0** màn hình ở chế độ phát triển mặc định hiển thị dữ liệu không đến từ database thật; và **0** đường dẫn từ lệnh mặc định tới chế độ mock.
- **SC-004a**: Khi chạy lệnh mock, dấu hiệu "dữ liệu giả" xuất hiện trong **100%** màn hình.
- **SC-005**: Khi backend không sẵn sàng, **100%** trường hợp cho ra thông báo lỗi kết nối, **0** trường hợp hiện dữ liệu giả.
- **SC-006**: Bộ test tích hợp ở local trên môi trường đang chạy nhanh hơn cách hiện tại (dựng container tạm) **≥ 60%** về thời gian.
- **SC-007**: Chạy bộ test tích hợp **hai lần liên tiếp** đều xanh, và bộ dữ liệu mẫu **không thay đổi một byte** sau khi chạy.
- **SC-007a**: Sau khi bộ test hoàn tất, **0** không gian test còn sót lại trên mọi engine; và hai lần chạy song song đều xanh.
- **SC-008**: **7/7** engine có ít nhất một test tích hợp chạy trên server thật (tăng từ 5/7 hiện tại theo A-06).
- **SC-008a**: CI mỗi-PR phủ **5/7** engine bằng test tích hợp thật và hoàn tất trong **≤ 15 phút** (mốc của testing-strategy §1); tập theo-lịch phủ **2 engine + nhánh MariaDB** còn lại.
- **SC-009**: Báo cáo kiểm chứng liệt kê **100%** nhóm kiểm tra bị bỏ qua kèm lý do; **0** nhóm bị bỏ qua trong im lặng.
- **SC-010**: Sai lệch giữa bảng kết nối trong README và cấu hình thật bị phát hiện **100%** số lần khi cố tình gây lệch để thử.
- **SC-010a**: Bảng ~100.000 dòng có mặt trên **100%** engine ngay sau lần khởi tạo đầu, và thời gian khởi tạo mặc định (chưa tính bảng 1M) **≤ 5 phút** cho toàn bộ môi trường trên máy đạt yêu cầu tài nguyên tối thiểu.
- **SC-011**: Bảng hiện trạng engine trong tài liệu có **100%** dòng kèm bằng chứng từ output lệnh; **0** dòng phỏng đoán.
- **SC-012**: **0** credential của môi trường phát triển xuất hiện trong ảnh Docker phát hành của sản phẩm.

---

## Assumptions

1. **Docker Desktop trên Windows 11** là môi trường mặc định của người dùng; các lệnh và tài liệu lấy đó làm chuẩn, đồng thời không dùng thứ gì riêng Windows để Linux/macOS vẫn chạy được.
2. **Cổng 1433 thuộc về người dùng.** Bảng cổng đã chốt ở FR-003. Ngoài 1433, giả định các cổng còn lại trong bảng đang rảnh trên máy phát triển; nếu không, FR-007 cho phép ghi đè qua biến môi trường.
3. **Máy đủ tài nguyên**: chạy đủ 7 engine cần khoảng 8 GB RAM cấp cho Docker. Tài liệu sẽ nêu con số này và cách chạy tập con khi không đủ.
4. **Không thay driver**: 7 driver đã kết nối thật, phạm vi việc này là môi trường, dữ liệu mẫu, đường mặc định của app và cách test — **không** viết lại driver.
5. **`transport-mock` được giữ lại** cho unit test giao diện **và cho lệnh phát triển mock riêng**; chỉ bị loại khỏi đường chạy mặc định. Tài liệu hướng dẫn chạy ứng dụng phải sửa lại tương ứng, vì hiện README đang khuyến nghị đường mock là "cách 1".
6. **Testcontainers được giữ lại** cho CI (nơi không có stack chạy sẵn); local ưu tiên stack Docker cố định. Hai đường phải dùng **cùng một bộ dữ liệu mẫu**.
7. **Bộ dữ liệu mẫu lấy cảm hứng từ Sakila** đang có trong fixture mock, nhưng được viết lại thành script nạp thật cho từng engine.
8. **Ba engine nặng (SQL Server, Oracle, MariaDB) chạy theo lịch trên CI**, không chạy mỗi PR, do thời gian khởi động và tài nguyên. Ở **local thì cả 7 engine đều chạy được** — phân chia này chỉ áp dụng cho CI.
9. **Không có yêu cầu bảo mật đặc thù ngành** cho môi trường local; áp chuẩn thông thường (loopback-only, credential dev-only).

---

## Out of Scope

- Viết lại hay bổ sung engine mới ngoài 7 engine hiện có.
- Môi trường staging / production, hạ tầng cloud, Kubernetes.
- Chạy và tinh chỉnh benchmark hiệu năng (đã có mục riêng trong backlog). Việc này chỉ **cung cấp dữ liệu nền** cho benchmark qua bảng 1.000.000 dòng sinh theo yêu cầu (FR-011a), không bao gồm bản thân benchmark hay ngưỡng fps.
- Test E2E Playwright (tầng khác; việc này chỉ dựng nền dữ liệu cho nó).
- Thay đổi giao diện ngoài phần bắt buộc để bỏ mock và hiện lỗi kết nối / dấu hiệu chế độ mock.
- Nâng cấp phiên bản engine đang được hỗ trợ.

---

## Dependencies

- Docker (Compose v2) trên máy phát triển.
- Băng thông để tải image engine lần đầu (Oracle và SQL Server là hai image lớn nhất).
- Cổng loopback rảnh cho từng engine; 1433 được coi là **đã bị chiếm**.
- Các cổng kiểm chứng hiện có phải tiếp tục xanh: `pnpm verify` (lint + depcruise + typecheck + build + test + check:contract).
