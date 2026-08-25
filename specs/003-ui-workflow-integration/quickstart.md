# Quickstart: 003-ui-workflow-integration

**Date**: 2026-08-24 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Cách dựng môi trường, chạy hai tầng kiểm thử, và xác minh feature. Dùng được cả khi bạn tiếp nhận
việc giữa đường.

---

## 0. Dependency — đã phê duyệt 2026-08-24

Ba devDependency cho môi trường DOM đã được người phụ trách duyệt theo AGENTS.md §3:
`jsdom`, `@testing-library/react`, `@testing-library/user-event`. Playwright đã được quy định sẵn ở
testing-strategy.md §5 nên không thuộc cổng này.

Hai điều kiện kèm theo, **phải giữ**:
- Cả ba ở `devDependencies` của **root**, không ở `dependencies` của package nào.
- **Không** đổi `environment: 'node'` toàn cục trong `vitest.config.ts` — bật `jsdom` theo glob cho
  tệp test UI, để 71 test hiện có giữ nguyên môi trường chạy.

Chi tiết: [research.md R1](./research.md).

---

## 1. Dựng môi trường database

Hạ tầng đã có sẵn từ feature 002 — không dựng lại.

```bash
pnpm db:up
```

```bash
pnpm db:doctor
```

`db:doctor` phải xanh cho cả 7 engine trước khi chạy bất kỳ tầng kiểm thử nào. Nếu đỏ, đọc
[docker/dev-db/README.md](../../docker/dev-db/README.md) — đừng đoán.

Đặt lại dữ liệu về trạng thái seed gốc:

```bash
pnpm db:reset
```

---

## 2. Chạy ứng dụng với DB thật

```bash
pnpm dev:web
```

```bash
pnpm dev:desktop
```

Hồ sơ kết nối cho stack cục bộ nằm ở [docker-dev-connections.json](../../docker-dev-connections.json),
nhập qua dialog nhập kết nối trong ứng dụng.

**Không** dùng `pnpm dev:mock` để kiểm feature này — nó chạy transport giả, đúng thứ feature này đang
loại bỏ khỏi đường mặc định.

---

## 3. Hai tầng kiểm thử

### Tầng rộng — 7 engine, UI dựng trong môi trường kiểm thử

```bash
pnpm test
```

Điều kiện tiên quyết: `pnpm db:up` đã chạy. Theo FR-021, tầng này **phải dừng sớm** với thông điệp
chỉ rõ container nào thiếu và lệnh cần chạy — chứ đỏ rải rác.

### Tầng sâu — ứng dụng thật, PostgreSQL + MySQL

```bash
pnpm test:e2e
```

Bốn project theo testing-strategy.md §5: `web-chromium`, `web-firefox`, `web-webkit`, `desktop`.
Phủ trọn L-1…L-6. Vì sao chọn hai engine này: [research.md R8](./research.md).

### Cổng đầy đủ

```bash
pnpm verify
```

Feature này **mở rộng** `verify`: thêm `tools/check-ui-wiring.ts` và đưa tầng kiểm thử UI vào
(FR-024). Trước feature này, `test:e2e` được khai báo nhưng không có nội dung nào để chạy (C-16).

---

## 4. Ba con số cần theo dõi

Cổng ratchet in ra sau mỗi lần `pnpm verify`. Cả ba **chỉ được giảm**:

| Hằng số | Khởi điểm 2026-08-24 | Đích | Nghĩa |
|---|---:|---:|---|
| `UI_WIRING_DEBT` | **46** (đo: 46 / 76 methods) | 0 | Phương thức RPC chưa có đường vào từ UI (SC-010) |
| `SURFACE_DEBT` | **11** (11 / 11 surfaces) | 0 | Bề mặt context menu chưa phản hồi nhấp phải (SC-015) |
| `HARDCODED_CHROME_DEBT` | **9** vị trí trong chrome UI | 0 | Chuỗi cứng mô tả kết nối/database/engine (SC-001) |

> ⏱️ **Baseline Verification**: Chạy qua `pnpm verify` (lint + typecheck + build + vitest 61 test files / 403 tests trong ~9.8s + `check:contract` + `check:ui-wiring` + `check:devdb`). Ratchet gates hoạt động đầy đủ.

Tăng bất kỳ số nào là hồi quy, không phải nợ mới. Khuôn mẫu: `HANDLER_DEBT` trong
[tools/check-contract.ts](../../tools/check-contract.ts) — hiện đã về 0.

---

## 5. Xác minh bằng mắt — bắt buộc khi chạm UI

AGENTS.md §1 bước 4: nếu chạm UI thì **chạy thật và xem bằng mắt**, không chỉ dựa vào test.
Kịch bản ngắn nhất chứng minh feature còn sống:

1. `pnpm dev:web`, nhập hồ sơ kết nối, mở kết nối **PostgreSQL** → thanh trạng thái phải hiện
   `PostgreSQL` + phiên bản **thật**, không phải `MySQL 8.0.36` (C-06).
2. Chuyển sang mở kết nối **MySQL** → chrome phải cập nhật hoàn toàn, không còn dấu vết PostgreSQL.
3. Nhấp phải một bảng trên cây → menu phải hiện ra (hiện tại **không** hiện — C-19).
4. Trên **SQLite**, mở menu tạo đối tượng → lệnh tạo Function phải **vắng mặt** trong context menu
   nhưng **hiện disabled kèm lý do** trên thanh công cụ (FR-046B — hai cách trình bày, một quyết định).
5. Chọn nhiều bảng, nhấp phải → `Drop` khả dụng cho cả tập; `Design Table` disabled kèm lý do
   "chỉ áp dụng cho một đối tượng" (FR-051).
6. Nhấn `Shift+F10` khi tiêu điểm ở một bảng → menu mở; nhấn Escape → tiêu điểm về đúng bảng đó (FR-047B).
7. `pnpm db:down`, thử mở kết nối → thông điệp lỗi **đọc được ngay trên giao diện** kèm nút thử lại;
   `pnpm db:up` rồi bấm thử lại → mở được, không cần khởi động lại app (FR-005, sửa C-14).
8. Kiểm thông điệp lỗi bước 7 **không** chứa mật khẩu hay vết ngăn xếp (SR-002, Cấm 6).

---

## 6. Thứ tự làm việc

Do phụ thuộc kỹ thuật, không phải ưu tiên nghiệp vụ:

```
0. Cài 3 devDependency (đã duyệt)       ← chặn bước 3
1. Ngữ cảnh hoạt động (US1)              ← chặn bước 2
2. Sổ đăng ký lệnh + gating (US2)        ← chặn bước 4, 5, và context menu
3. Hai tầng kiểm thử + ratchet (US3)     ← song song được với 1–2; phải xanh trước khi mở bước 4
4. Nối 46 phương thức (US4)  ‖  Bộ công cụ Tools (US5)
5. Hàng đợi US6 (chỉ lập bảng, không hiện thực)
```

Bên trong bước 4–5, **L-1…L-6 là thứ tự nghiệm thu tuyệt đối** (mục "Luồng cốt lõi" của spec):
kết nối → viết SQL → chạy → sửa dữ liệu → nhập/xuất → bộ công cụ Tools.

---

## 7. Bẫy đã biết

| Bẫy | Vì sao dễ sập |
|---|---|
| Tạo khoá react-query mới cho `capabilities` | `useNavTree` đã cache ở `['connection', id, 'open']`. Khoá mới ⇒ `connection.open` chạy hai lần và hai bản caps có thể lệch. Xem [contracts/active-context.md §3](./contracts/active-context.md) |
| Giữ `selTable`/`selNode`/`selField` song song với ngữ cảnh mới | Hai nguồn sự thật — đúng loại lỗi C-04 gây ra. Phải **thay thế**, không thêm |
| Viết `if (driverId === …)` khi làm gating | Cấm 2. Kiểu `Availability` cố tình không có chỗ để viết; nếu bạn thấy cần thì vị từ `CapabilitySet` đang thiếu — sửa ở đó |
| Dùng lại `ObjectContextMenu.tsx` nguyên trạng | Nó hard-code chuỗi tiếng Việt và hex `#ef4444` (C-20). Đem vào dùng phải sửa cả hai, không mang theo vi phạm |
| Viết danh sách bảng kỳ vọng vào mã test | FR-020 cấm. Khẳng định phải so UI ↔ DB đọc lúc chạy, không so UI ↔ hằng số |
| Chọn selector theo text trong test | i18n có 3 ngôn ngữ. Dùng `data-testid` (testing-strategy.md §5). Hiện toàn `packages/ui` chỉ có **7** `data-testid` — phải thêm khi sửa component, không phải khi viết test |
| Mặc định "có hỗ trợ" khi `capabilities === null` | Ở lệnh ghi, đoán sai có thể chạy DDL sai engine. Mặc định phải là disabled kèm lý do |
| Lấy `selection.names[0]` khi đang chọn nhiều | FR-051 cấm âm thầm. Lệnh một-đối-tượng phải disabled kèm lý do |
