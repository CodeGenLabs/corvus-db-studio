# Phase 0 — Research: Môi trường DB thật trên Docker

**Branch**: `002-docker-real-env-testing` | **Date**: 2026-08-21 | **Plan**: [plan.md](./plan.md)

Mọi mục `NEEDS CLARIFICATION` trong Technical Context đã được giải quyết bên dưới. Định dạng: **Decision** / **Rationale** / **Alternatives considered**.

---

## R-1 · Phiên bản image cho từng engine

*(Deferred từ vòng clarify — quyết định ở đây.)*

**Decision**: dùng đúng phiên bản mà bộ test tích hợp **hiện tại** đã chạy xanh, không nâng cấp:

| Engine | Image | Nguồn |
|---|---|---|
| PostgreSQL | `postgres:16-alpine` | `.github/workflows/integration.yml:39` |
| MySQL | `mysql:8.0` | `packages/driver-mysql/src/mysql.integration.test.ts:27` |
| MariaDB | `mariadb:11.4` (LTS) | mới — chưa có tiền lệ trong repo |
| SQL Server | `mcr.microsoft.com/mssql/server:2022-latest` | `packages/driver-mssql/src/mssql.integration.test.ts:23` |
| Oracle | `gvenzl/oracle-free:23-slim` | `packages/driver-oracle/src/oracle.integration.test.ts:23` |
| MongoDB | `mongo:7` | mới |
| Redis | `redis:7-alpine` | mới |
| SQLite | *(không container)* | tệp `.sqlite` sinh bằng `better-sqlite3` |

**Rationale**: Assumption 9 của spec chốt "không nâng cấp phiên bản engine đang được hỗ trợ". Dùng lại đúng tag đã xanh loại bỏ hoàn toàn một biến số — nếu test đỏ sau khi chuyển sang stack cố định thì nguyên nhân là cách chuyển, không phải phiên bản engine. MariaDB 11.4 chọn bản LTS vì đây là engine mới hoàn toàn (A-08), lấy bản ổn định lâu.

**Alternatives considered**: (a) dùng tag `latest` cho tất cả — bị loại, `latest` làm môi trường không lặp lại được, đúng thứ FR-012 cấm. (b) nâng PostgreSQL lên 17 / MySQL lên 8.4 — bị loại, trộn hai loại thay đổi vào một feature khiến khi đỏ không biết lỗi ở đâu; nâng cấp nên là feature riêng.

---

## R-2 · Cách nạp dữ liệu mẫu cho từng engine

**Decision**: mỗi engine dùng cơ chế nạp **tự nhiên của chính image đó** khi có, và một bước nạp sau-khi-khoẻ do `tools/devdb` điều phối khi không có. Cụ thể:

| Engine | Cơ chế | Ghi chú |
|---|---|---|
| PostgreSQL | mount vào `/docker-entrypoint-initdb.d/` | chạy `.sql` theo thứ tự tên file, chỉ ở lần khởi tạo volume đầu |
| MySQL / MariaDB | mount vào `/docker-entrypoint-initdb.d/` | cùng bộ `.sql`; MariaDB dùng lại y nguyên script MySQL |
| MongoDB | mount vào `/docker-entrypoint-initdb.d/` | file `.js` chạy bằng `mongosh` |
| Oracle | mount vào `/container-entrypoint-initdb.d/` | `gvenzl/oracle-free` hỗ trợ sẵn; khởi động chậm nhất trong stack |
| **SQL Server** | **không có hook init** → `tools/devdb` chờ healthcheck rồi chạy `sqlcmd` trong container | ảnh `mcr.microsoft.com/mssql/server` không có cơ chế initdb |
| **Redis** | **không có hook init** → `tools/devdb` chờ healthcheck rồi nạp qua `redis-cli` | |
| SQLite | không container → sinh tệp mẫu bằng `better-sqlite3` khi chạy lệnh `up` | |

**Rationale**: hai engine không có hook init là sự thật kỹ thuật không tránh được, nên thay vì phát minh một cơ chế thống nhất giả tạo cho cả 7, ta để `tools/devdb up` làm điều phối viên duy nhất: khởi động → chờ khoẻ → nạp phần còn thiếu → ghi dấu hoàn tất. Điều này cũng chính là chỗ giải quyết edge case "nạp dữ liệu bị ngắt giữa đường": dấu hoàn tất được ghi **sau cùng**, nên lần chạy sau phát hiện được trạng thái dở dang.

**Alternatives considered**: (a) một container "seeder" riêng chạy sau tất cả — bị loại vì thêm một service vào compose chỉ để làm việc mà `tools/devdb` đã phải làm (chờ khoẻ), và khó báo lỗi ra terminal người dùng. (b) nạp lười (lazy) ở lần test đầu — bị loại, phá FR-008 ("không cần bước tay") và làm lần test đầu chậm bất thường.

---

## R-3 · Cơ chế cách ly theo engine cho test (FR-021b)

**Decision**: một khai báo `TestEnvDialect` ở `packages/driver-core/src/testenv/dialect.ts`, mỗi engine khai đúng ba việc: *tạo không gian*, *đủ điều kiện tên*, *xoá không gian*.

| Engine | Không gian riêng mỗi lần chạy | Xoá |
|---|---|---|
| PostgreSQL | `CREATE SCHEMA corvus_t_<id>` | `DROP SCHEMA … CASCADE` |
| SQL Server | `CREATE SCHEMA corvus_t_<id>` | drop từng đối tượng rồi drop schema |
| Oracle | schema = user → tạo user `CORVUS_T_<ID>` | `DROP USER … CASCADE` |
| MySQL / MariaDB | không có tầng schema → `CREATE DATABASE corvus_t_<id>` | `DROP DATABASE` |
| MongoDB | `db("corvus_t_<id>")` | `dropDatabase()` |
| Redis | không có schema/database có tên → **prefix khoá** `corvus:t:<id>:` | `SCAN` theo prefix + `UNLINK` |
| SQLite | không dùng chung → **tệp tạm riêng** mỗi lần chạy | xoá tệp |

`<id>` sinh ngẫu nhiên. Mọi tên đi vào SQL **phải** qua `quoteIdentifier` của `@corvus/sql` (Cấm 4).

**Rationale**: đây là chỗ duy nhất tri thức "engine này khác engine kia" được phép nằm, đúng tiền lệ `ConformanceDialect` đã có (`hasSchemas`, `qualify()`). Khu trú vào một file khiến Cấm 2 kiểm được bằng mắt: nếu có `if (driverId===…)` ở bất kỳ file test nào khác thì đó là vi phạm.

Redis là ngoại lệ duy nhất phải dùng prefix thay vì không gian có tên — Redis có "numbered database" (0–15) nhưng chỉ 16 slot, không đủ cho định danh ngẫu nhiên và không an toàn khi chạy song song.

**Alternatives considered**: (a) numbered database cho Redis — bị loại vì chỉ 16 slot, hai lần chạy song song sẽ đụng. (b) mỗi lần chạy một container riêng — quay lại đúng chỗ testcontainers, phá mục tiêu SC-006. (c) transaction rollback — đã bị loại ở vòng clarify (Q3 option C): không cách ly được DDL, Redis/Mongo không có.

---

## R-4 · Chốt an toàn chống trỏ test vào database thật (SR-005)

**Decision**: `packages/driver-core/src/testenv/resolve.ts` từ chối chạy nếu **bất kỳ** điều kiện sau không thoả:

1. Host thuộc allowlist loopback (`127.0.0.1`, `localhost`, `::1`) **hoặc** host được khai tường minh trong biến môi trường dành riêng cho CI.
2. Cổng khớp bảng cổng của môi trường (`tools/devdb/ports.ts`).
3. Tồn tại một **dấu hiệu môi trường phát triển** trong chính database — một bảng/khoá đánh dấu do bước seed ghi vào. Không thấy dấu này thì từ chối, kể cả khi host là loopback.

**Rationale**: điều kiện 1 và 2 chặn tai nạn cấu hình; điều kiện 3 chặn trường hợp nguy hiểm nhất — người dùng có một database thật đang chạy trên chính cổng đó ở loopback. Tài liệu dự án nói thẳng "công cụ này ghi vào cơ sở dữ liệu production của người khác, một lỗi có thể phá dữ liệu không khôi phục được" ([testing-strategy.md](docs/04-plan/testing-strategy.md)), nên ba lớp là tương xứng, không phải quá mức.

**Alternatives considered**: chỉ kiểm loopback — bị loại vì SQL Server ở 1433 của người dùng cũng ở loopback; nếu ai đó đặt sai cổng thành 1433 thì chốt một lớp không cứu được.

---

## R-5 · Chuyển bộ test tích hợp: giữ hay bỏ testcontainers

**Decision**: giữ cả hai đường, chọn bằng **biến môi trường**, và **cùng dùng một bộ seed**:

- Có biến trỏ tới môi trường → dùng stack cố định (đường mặc định ở local).
- Không có biến → dùng testcontainers như hiện tại (đường của CI).
- Bộ seed dùng chung: `POSTGRES_SETUP_SQL` (và các hằng tương đương) trong `driver-core/conformance/fixture.ts` **được sinh từ cùng các file** `docker/dev-db/seed/*` chứ không viết hai lần.

**Rationale**: Assumption 6 của spec đã chốt hướng này. Điểm mấu chốt là **một nguồn seed duy nhất** — nếu seed của Docker và seed của testcontainers viết riêng thì hai đường sẽ lệch dần, và test xanh ở CI đỏ ở local (hoặc ngược lại) mà không ai hiểu vì sao. Đây là rủi ro thật, đã được ghi vào Complexity Tracking.

**Alternatives considered**: (a) bỏ testcontainers hoàn toàn, CI cũng chạy compose — bị loại: CI phải quản vòng đời stack, dọn dẹp khi job bị hủy, và mất tính năng cấp cổng ngẫu nhiên của testcontainers (chạy song song nhiều job sẽ đụng cổng). (b) bỏ stack cố định — phá yêu cầu gốc của người dùng.

---

## R-6 · Chống lệch README ↔ cấu hình (FR-028)

**Decision**: `tools/devdb/ports.ts` là **nguồn sự thật duy nhất** cho bảng cổng/credential. Từ đó:

- `compose.yaml` đọc qua file môi trường sinh ra từ nó.
- `tools/devdb/check-readme.ts` phân tích bảng markdown trong `README.md` và so từng ô với `ports.ts`; lệch thì thoát khác 0.
- Bước này gắn vào `pnpm verify` (thêm bước thứ 7), cùng chỗ với `check:contract` đã có tiền lệ.

**Rationale**: dự án đã có đúng khuôn mẫu này — `tools/check-contract.ts` kiểm 76 method RPC so với registry và được gọi từ `pnpm verify`. Làm theo khuôn mẫu đã tồn tại thay vì phát minh cơ chế mới.

**Alternatives considered**: (a) sinh thẳng bảng README từ `ports.ts` — hấp dẫn nhưng bị loại vì README có văn xuôi xen quanh; sinh tự động sẽ hoặc đè mất văn xuôi hoặc cần cơ chế marker phức tạp. Kiểm-thay-vì-sinh giữ được cả hai. (b) chỉ dựa vào review người — chính là cách A-04 đã xảy ra.

---

## R-7 · Chặn mock lọt vào bản phát hành (SC-012, FR-013a)

**Decision**: hai lớp:

1. **Cổng tĩnh**: thêm luật `dependency-cruiser` chặn `packages/transport-mock` khỏi `packages/ui`, `apps/desktop/main`, `apps/web/server`, và root `src/`. Cho phép duy nhất ở file test và ở entry point mock riêng.
2. **Cổng bundle**: sau `pnpm build`, kiểm `dist/` của ba app Node và của bundle web — nếu chuỗi nhận diện fixture mock xuất hiện thì thoát khác 0.

**Rationale**: A-01/A-02/A-12 lọt được **chính vì** 7 luật depcruise hiện tại không kể `transport-mock` (chỉ chặn `driver-*`, `engine`, `storage`, `tunnel`). Lớp 1 bịt lỗ đó. Lớp 2 cần thêm vì bundler có thể kéo mock vào qua đường vòng mà graph tĩnh không thấy — và bằng chứng là fixture sakila **đang thật sự có trong** `apps/desktop/main/dist/index.cjs:5403`.

**Alternatives considered**: chỉ lớp 1 — bị loại, không phát hiện được trường hợp đang tồn tại nếu đường import đi qua re-export nhiều tầng (`packages/ui/src/index.ts:10` đúng là một tầng như vậy).

---

## R-8 · Observability của môi trường

*(Deferred từ vòng clarify — quyết định ở đây, mức tối thiểu.)*

**Decision**: không thêm hạ tầng quan sát. `tools/devdb doctor` in một bảng trạng thái: engine · cổng · khoẻ/không · phiên bản server thật · đã seed hay chưa · số dòng của bảng mẫu. Log container để nguyên cho `docker compose logs`.

**Rationale**: đây là môi trường phát triển local, không phải hệ thống chạy thật. Một lệnh `doctor` giải quyết đúng câu hỏi người dùng thật sự hỏi ("vì sao test đỏ / engine nào chưa lên"). Thêm metric/tracing ở tầng này là chi phí không có người dùng.

**Alternatives considered**: gắn Prometheus/Grafana — bị loại rõ ràng, ngoài phạm vi và mâu thuẫn Out of Scope của spec.

---

## R-9 · Dấu hiệu chế độ mock trên giao diện (FR-016a)

**Decision**: một component `MockModeBanner` thường trực ở khung ngoài (không phải toast, không tự tắt được), nội dung đi qua hệ i18n đã có của `packages/ui` (3 ngôn ngữ). Cờ bật/tắt truyền vào từ **entry point** (`dev:mock`), không đọc `window` hay biến toàn cục trong component (Cấm 3).

**Rationale**: FR-016a đòi "không thể bỏ qua, không tự tắt". Toast vi phạm cả hai. Truyền cờ từ entry point giữ được Cấm 3 và làm banner không thể xuất hiện ở bản phát hành vì entry point mock không được build.

**Alternatives considered**: chỉ đổi màu viền cửa sổ — bị loại, không rõ nghĩa với người mới, và không đáp ứng "100% màn hình" của SC-004a một cách kiểm chứng được.

---

## Rủi ro còn lại

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Chỗ ở của `buildEngine()` chưa được phê duyệt (Cấm 8) | **Cao** — chặn nhóm việc A-11 | Hỏi người phụ trách trước khi bắt đầu nhóm desktop; các nhóm khác không bị chặn |
| Oracle khởi động chậm/nặng làm `up` vượt mốc 5 phút của SC-010a | Trung bình | Cho phép bật tập con (FR-005); đo riêng và ghi số thật vào README |
| Bỏ fixture khỏi 8 file UI làm vỡ test UI hiện có | Trung bình | `transport-mock` vẫn còn cho unit test (FR-017) — test UI chuyển sang dùng nó tường minh thay vì import fixture qua `data/schema` |
| Seed 100k dòng × 7 engine làm volume phình | Thấp | Bảng 1M nằm sau lệnh riêng (FR-011a); đo và ghi dung lượng thật vào README |
