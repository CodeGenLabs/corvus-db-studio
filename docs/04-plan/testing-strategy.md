# Chiến lược kiểm thử

Công cụ này ghi vào cơ sở dữ liệu production của người khác. Một lỗi có thể phá dữ liệu không
khôi phục được. Kiểm thử **không phải** là việc làm nếu còn thời gian.

---

## 1. Năm tầng

```
       ┌──────────────────────────────┐
   5   │  Manual / Exploratory        │  mỗi wave, theo checklist
       ├──────────────────────────────┤
   4   │  E2E (Playwright)            │  ~80 spec · web + desktop
       ├──────────────────────────────┤
   3   │  Integration (testcontainers)│  ~400 test · DB thật
       ├──────────────────────────────┤
   2   │  Contract & Conformance      │  ~180 test/driver + contract check
       ├──────────────────────────────┤
   1   │  Unit (Vitest)               │  ~2 500 test
       └──────────────────────────────┘
```

| Tầng | Chạy khi | Thời lượng mục tiêu | Cần Docker |
|---|---|---|---|
| 1 Unit & UI Broad (DOM jsdom) | mọi lần lưu file (watch) + mọi PR (`pnpm test` / `pnpm verify`) | ≤ 60 s (đo thật: ~35s-48s cho 91 test files, 474+ tests) | ❌ |
| 2 Contract & Conformance | mọi PR (`pnpm check:contract`) | ≤ 5 phút | ✅ (conformance) |
| 3 Integration | mọi PR / local (`pnpm test:it`) | ≤ 2 phút (local stack: ~35s) / ≤ 40 phút (CI testcontainers) | ✅ |
| 4 E2E (Playwright L1-L6) | mọi PR (web smoke) + nightly (đầy đủ) | ≤ 15 phút | ✅ |
| 5 Manual | trước mỗi mốc phát hành | 1–2 ngày | — |

---

## 2. Tầng 1 · Unit

**Phạm vi**: hàm thuần, dialect, formatter, parser, tính toán diff, redaction, AST → SQL,
component UI (với `transport-mock`).

**Ngưỡng phủ (ép trong CI)**

| Package | Statement | Branch | Ghi chú |
|---|---:|---:|---|
| `@corvus/sql` | 95% | 90% | Chỗ dễ sai nhất, phủ cao nhất |
| `@corvus/contract` | 90% | 85% | |
| `@corvus/services` | 85% | 80% | |
| `@corvus/driver-*` | 80% | 70% | Phần còn lại do conformance phủ |
| `@corvus/ui` | 70% | 60% | Phần còn lại do E2E phủ |
| `@corvus/engine` | 85% | 80% | |

Phủ **không phải mục tiêu**, nó là tín hiệu. Ngưỡng để phát hiện code hoàn toàn không được test,
không phải để đua số.

**Bắt buộc dùng golden file** cho:
- `splitStatements` — 60 case/dialect
- `alterTable` diff — 40 case/engine
- `buildSelect` — 30 case/dialect
- `DdlGenerator.createTable` — 25 case/engine
- Formatter SQL — 30 case

Golden file nằm ở `fixtures/golden/<area>/<name>.{in,out}`. Cập nhật bằng
`pnpm test -u` **và phải review diff trong PR** — thay đổi golden file mà không giải thích là
dấu hiệu hồi quy.

---

## 3. Tầng 2 · Contract & Conformance

### 3.1 Contract check (`tools/check-contract.ts`)

Chạy mọi PR, kiểm 5 điều:

```
1. Mọi MethodName trong registry có handler đăng ký trong engine
2. Mọi handler có method tương ứng trong contract
3. Mọi method có ít nhất một test qua transport-mock
4. Mọi method apply* nhận previewToken VÀ có preview* cặp đôi (ADR-0010)
5. Mọi method khai báo `permission` và `audit`
```

### 3.2 Driver conformance

180 test/driver, 9 nhóm — xem [driver-spi.md](../02-architecture/driver-spi.md) §8.

```bash
pnpm --filter @corvus/driver-postgres test:conformance
```

Ma trận version (nightly):

| Engine | Version test |
|---|---|
| PostgreSQL | 13, 15, 16 |
| MySQL | 5.7, 8.0, 8.4 |
| MariaDB | 10.11, 11.4 |
| SQLite | 3.40, 3.45 |
| SQL Server | 2019, 2022 |
| Oracle | 19c, 23 Free |
| MongoDB | 6.0, 7.0 |
| Redis | 6.2, 7.2 |

MySQL 5.7 và PostgreSQL 13 quan trọng: nhiều capability khác biệt chỉ lộ ra ở version cũ.

---

## 4. Tầng 3 · Integration

Tầng 3 hỗ trợ **hai đường chạy song song** (theo thiết kế `packages/driver-core/src/testenv/resolve.ts`):
1. **Đường ưu tiên (Local Developer)**: Tự động phát hiện và kết nối trực tiếp vào stack Docker dev-db cố định (`docker/dev-db/compose.yaml` qua `pnpm db:up`). Thời gian chạy toàn bộ 9 package integration test siêu nhanh (~35 giây).
2. **Đường dự phòng (CI / Máy sạch)**: Tự động fallback sang `testcontainers` khởi tạo container động trên fly nếu không có biến môi trường hoặc stack local chưa chạy.

```ts
// packages/driver-core/src/testenv/resolve.ts
const env = await resolveDriverTestEnv('postgres', { seed: true })
const conn = await postgresDriver.connect(env.profile)
```

**Bắt buộc có integration test cho**:

| Lĩnh vực | Kịch bản bắt buộc |
|---|---|
| Import/Export | round-trip mọi định dạng; file 1 GB (RAM); 5 mode; encoding lạ; lỗi từng dòng |
| Backup/Restore | round-trip; file chạy được bằng client CLI ngoài; verify phát hiện file hỏng |
| Data Editor | round-trip mọi kiểu; optimistic lock 2 session; NULL vs '' |
| DDL | 40 kịch bản diff; SQLite recreate giữ dữ liệu |
| Data Sync | 10M dòng merge join (RAM); rollback script khôi phục đúng |
| Transaction | commit/rollback/savepoint/isolation; DDL trong tx |
| Streaming | 10M dòng ≤ 400 MB; huỷ ≤ 200 ms; không rò session |
| Pool | 200 lần open/close không rò socket |
| Tunnel | SSH thật (container `linuxserver/openssh-server`); host key mismatch bị chặn |
| Scheduler | 3 instance + 1 lịch → chạy đúng 1 lần |
| Security | GRANT/REVOKE round-trip; mật khẩu không rò |

### Dữ liệu test

`fixtures/sql/` chứa schema chuẩn cho mỗi engine:

| File | Nội dung |
|---|---|
| `sakila-<engine>.sql` | Schema quan hệ chuẩn (bảng, FK, view, routine, trigger) |
| `types-<engine>.sql` | **Một bảng chứa mọi kiểu dữ liệu** của engine đó — dùng cho C4 |
| `edge-names-<engine>.sql` | Tên có unicode, dấu cách, từ khoá SQL, ký tự đặc biệt |
| `large-<engine>.sql` | Sinh 10M dòng (dùng generate_series / recursive CTE) |
| `wide-<engine>.sql` | Bảng 500 cột; schema 5 000 bảng |

`edge-names` cực kỳ quan trọng — quoting sai identifier là lớp lỗi bảo mật, không chỉ lỗi hiển thị.

---

## 5. Tầng 4 · E2E (Playwright)

Chạy trên **cả hai target**:

```ts
// e2e/playwright.config.ts
projects: [
  { name: 'web-chromium',  use: { ...devices['Desktop Chrome'] } },
  { name: 'web-firefox',   use: { ...devices['Desktop Firefox'] } },
  { name: 'web-webkit',    use: { ...devices['Desktop Safari'] } },
  { name: 'desktop',       use: { /* _electron.launch */ } },
]
```

**Mỗi SPEC phải có ít nhất một E2E spec** cho luồng chính (happy path) và một cho luồng lỗi.

Danh sách E2E bắt buộc trước GA:

```
connection.spec.ts        tạo → test → mở → duyệt cây → đóng
connection-ssh.spec.ts    kết nối qua SSH, host key mới → tin → kết nối
readonly.spec.ts          bật read-only → thử sửa → bị chặn ở UI và engine
data-edit.spec.ts         sửa cell → preview → apply → dữ liệu đổi thật
data-conflict.spec.ts     2 tab sửa cùng dòng → xung đột → xử lý
sql-run.spec.ts           gõ → chạy → nhiều result → huỷ
sql-guard.spec.ts         DELETE không WHERE → cảnh báo; read-only → chặn
designer-alter.spec.ts    đổi cột → xem DDL → apply → schema đổi thật
designer-drop.spec.ts     xoá bảng → gõ tên xác nhận → bảng mất
import.spec.ts            wizard 6 bước → job → kết quả
export.spec.ts            wizard → file tải về được
backup-restore.spec.ts    backup → xoá bảng → restore → dữ liệu về
automation.spec.ts        tạo batch job → lập lịch → chạy ngay → log
security.spec.ts          tạo user → grant → xem preview → apply
tabs.spec.ts              3 tab SQL độc lập; đóng tab dirty → hỏi
theme-i18n.spec.ts        đổi theme và 3 ngôn ngữ, không reload
offline.spec.ts           ngắt engine → banner → nối lại → dùng tiếp
perf-grid.spec.ts         1M dòng: fps + first paint (trace)
```

**Quy tắc chọn selector**: dùng `data-testid`, **không** dùng text (vì i18n) và **không** dùng
class (vì styling đổi). Thêm `data-testid` vào component khi viết, không phải khi viết test.

---

## 6. Tầng 5 · Manual / Exploratory

Trước mỗi mốc phát hành, chạy theo checklist. Không thay được bằng tự động vì mục tiêu là
**tìm cái ta chưa nghĩ tới**.

Checklist bắt buộc:

```
[ ] Cài bản mới trên máy Windows sạch (không có Node, không có Visual C++ redist)
[ ] Nâng cấp từ phiên bản trước với workspace thật có dữ liệu
[ ] Kết nối tới ít nhất 1 database production thật (chế độ read-only)
[ ] Thao tác với bảng thật > 10 triệu dòng
[ ] Rút cáp mạng giữa lúc chạy query lớn
[ ] Rút cáp mạng giữa lúc chạy job import
[ ] Kill process engine giữa lúc chạy job
[ ] Đổi ngôn ngữ sang tiếng Nhật, kiểm mọi màn hình không bị vỡ layout
[ ] Dùng chỉ bàn phím trong 15 phút (a11y)
[ ] Zoom trình duyệt 50% và 200%
[ ] Màn hình 1366×768 (không bị cắt nội dung)
[ ] Dark mode toàn bộ màn hình
[ ] Ổ đĩa gần đầy khi backup
```

---

## 7. Kiểm thử bảo mật

Ngoài 5 tầng, có bộ riêng chạy mọi PR:

```
vault-leak.test.ts            secret không xuất hiện trong log/response/audit/telemetry
connection-secret-leak.test.ts mật khẩu DB không rò qua bất kỳ connection.* method
security-password-leak.test.ts mật khẩu user không rò khi tạo/sửa user
ai-payload-leak.test.ts        giá trị dòng không lọt vào payload AI
ai-no-execute.test.ts          không có đường từ services/ai tới thực thi
identifier-injection.test.ts   tên object độc hại không phá được SQL sinh ra
preview-bypass.test.ts         không có đường ghi nào bỏ qua preview-token
readonly-bypass.test.ts        read-only không bypass được qua bất kỳ method nào
csp.test.ts                    trang không nạp resource ngoài
preload-surface.test.ts        preload phơi đúng 1 API, không hơn
```

**Mỗi test này ánh xạ tới một mối đe doạ trong**
[security.md](../02-architecture/security.md) §1. Thêm mối đe doạ mới → thêm test.

Ngoài ra: `pnpm audit` + `trivy` weekly; pentest nội bộ trước GA.

---

## 8. Kiểm thử hiệu năng

Chạy trong CI (nightly), **fail khi tụt quá 15%** so với baseline đã ghi:

| Benchmark | File | Ngưỡng |
|---|---|---|
| Grid cuộn 1M dòng | `e2e/perf-grid.spec.ts` | ≥ 55 fps |
| First paint sau chunk đầu | `e2e/perf-grid.spec.ts` | ≤ 150 ms |
| Điều phối lệnh Command Registry (11 bề mặt) | `packages/ui/src/__tests__/context-menu-surfaces.dom.test.tsx` | ≤ 100 ms |
| Phân trang DataGrid 100k dòng (lô 100 dòng) | `packages/ui/src/__tests__/data-browse-paging.dom.test.tsx` | ≤ 200 ms |
| Stream 10M dòng: RAM engine | `services/__bench__/stream.bench.ts` | ≤ 400 MB |
| Import 1 GB CSV: RAM + thời gian | `services/__bench__/import.bench.ts` | ≤ 300 MB, ≤ 4 phút (PG COPY) |
| `introspect.objects` 5 000 bảng | `driver-*/__bench__/introspect.bench.ts` | ≤ 800 ms |
| Bundle initial gzip | `tools/check-bundle-size.mjs` | ≤ 900 KB |
| Khởi động desktop | `e2e/desktop-startup.spec.ts` | ≤ 2.5 s |

Baseline lưu trong `fixtures/perf-baseline.json`, cập nhật có review.

---

## 9. Định nghĩa "test tốt"

| ✅ Test tốt | ❌ Test tệ |
|---|---|
| Kiểm hành vi người dùng thấy được | Kiểm chi tiết hiện thực nội bộ |
| Fail thì tên test đủ cho biết cái gì hỏng | Tên là `test('works')` |
| Độc lập, chạy được đơn lẻ và song song | Phụ thuộc thứ tự chạy |
| Không có `sleep`; đợi điều kiện cụ thể | `await sleep(2000)` |
| Dữ liệu tự tạo tự dọn | Dựa vào dữ liệu còn lại từ test khác |
| Một lý do để fail | Kiểm 10 thứ không liên quan |

Cấm: `test.skip` không có comment giải thích và mã task để bỏ skip; `--no-verify`;
tăng timeout để test qua.

---

## 10. Xử lý test flaky

Test không ổn định **tệ hơn không có test** — nó dạy team bỏ qua màu đỏ.

Quy trình khi phát hiện flaky:
```
1. Ghi issue kèm log 2 lần chạy (một pass, một fail)
2. Đánh dấu `test.fixme` KÈM mã issue — không phải `test.skip` im lặng
3. Sửa trong vòng 5 ngày làm việc
4. Quá 5 ngày → xoá test và ghi vào nợ kỹ thuật (test flaky không có giá trị)
```

Theo dõi: CI ghi tỉ lệ pass của từng test; test có tỉ lệ < 98% trong 20 lần chạy gần nhất bị
báo tự động.
