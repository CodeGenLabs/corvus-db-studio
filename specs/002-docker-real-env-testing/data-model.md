# Phase 1 — Data Model: bộ dữ liệu mẫu `corvus_dev`

**Branch**: `002-docker-real-env-testing` | **Date**: 2026-08-21 | **Plan**: [plan.md](./plan.md)

Feature này không thêm thực thể nào vào **miền của sản phẩm** (không sửa `packages/contract`, không sửa schema `workspace.db`). "Data model" ở đây là **bộ dữ liệu mẫu nằm trong các engine đích** — thứ mà FR-008…FR-012 mô tả và mọi test dựa vào.

Không có PDL domain model (`domain-model.md` không tồn tại) → tài liệu này là mô hình chuẩn cho bộ dữ liệu mẫu.

---

## 1. Quan hệ với fixture conformance đã có

`packages/driver-core/src/conformance/fixture.ts` đã có một schema mẫu `corvus_conf` gồm `country`, `city`, `order details`, `city_view`, `types_probe` — cố tình chứa tên có dấu cách/unicode/từ khoá SQL, NULL vs chuỗi rỗng, bigint vượt 2^53.

**Quyết định**: bộ dữ liệu mẫu mới **mở rộng** mô hình đó chứ không thay thế. Lý do: R-5 của [research.md](./research.md) buộc hai đường test (Docker và testcontainers) dùng **một nguồn seed duy nhất**; nếu bộ mới là một mô hình khác thì suite conformance hiện đang xanh sẽ phải viết lại — rủi ro không cần thiết.

| Không gian | Nội dung | Ai dùng |
|---|---|---|
| `corvus_conf` | fixture conformance hiện có, **giữ nguyên không sửa** | `runConformanceSuite` |
| `corvus_dev` | **MỚI** — bộ dữ liệu mẫu của môi trường Docker, siêu tập của `corvus_conf` | người dùng thao tác tay · test tích hợp · UI |
| `corvus_t_<id>` | không gian tạm mỗi lần chạy test (R-3) | chỉ test, xoá sau khi xong |

---

## 2. Thực thể

### 2.1 · Lõi quan hệ (kế thừa từ `corvus_conf`)

| Thực thể | Trường chính | Quan hệ | Mục đích kiểm chứng |
|---|---|---|---|
| `country` | `country_id` PK · `country` (unique) · `iso_code` char(2) · `last_update` | 1—n `city` | PK tự tăng · unique index · comment trên bảng và cột · kiểu char cố định |
| `city` | `city_id` PK · `country_id` FK · `city` · `note` | n—1 `country` (ON DELETE CASCADE) | FK có hành vi cascade · index thường · NULL vs chuỗi rỗng cùng tồn tại |
| `"order details"` | `id` PK · `"sản lượng"` numeric(20,4) · `"select"` | — | **quoting**: tên bảng có dấu cách, tên cột có dấu tiếng Việt, tên cột trùng từ khoá SQL |
| `types_probe` | `big_val` bigint · `numeric_val` numeric(30,10) · `bool_val` · `text_null` · `text_empty` · `json_val` · `bytes_val` · `ts_val` | — | bigint vượt 2^53 không mất chính xác · numeric độ chính xác cao · nhị phân · JSON · timestamp có múi giờ |
| `city_view` (view) | — | đọc từ `city` ⨝ `country` | introspect phân biệt table và view |

### 2.2 · Mở rộng cho môi trường Docker (mới)

| Thực thể | Trường chính | Mục đích kiểm chứng | FR |
|---|---|---|---|
| `customer` | `customer_id` PK · `country_id` FK · `email` (unique) · `full_name` · `created_at` · `is_active` | thực thể đủ "thật" để thao tác tay trong UI có ý nghĩa; FK thứ hai để ER diagram có hình | FR-009 |
| `order_log` | `order_log_id` PK · `customer_id` FK · `amount` · `status` · `placed_at` | **bảng ~100.000 dòng** — phân trang, stream, sort trên cột có index và không index | **FR-011** |
| `order_log_bulk` | cùng hình dạng `order_log` | **bảng ~1.000.000 dòng, sinh theo yêu cầu** — không tồn tại sau `up` mặc định | **FR-011a**, FR-011b |
| `customer_summary` (view) | tổng hợp theo `customer` | view có aggregate — khác `city_view` là view join thuần | FR-010 |
| `fn_customer_total` (routine) | hàm/procedure trả tổng theo khách | introspect stored routine ở engine hỗ trợ | FR-010 |
| `trg_order_log_touch` (trigger) | cập nhật dấu thời gian khi ghi | introspect trigger ở engine hỗ trợ | FR-010 |
| **`corvus_env_marker`** | `key` PK · `value` · `seeded_at` · `seed_version` | **dấu hiệu môi trường phát triển** — chốt an toàn SR-005 đọc bảng này để từ chối chạy khi không thấy; đồng thời là **dấu hoàn tất seed** giải quyết edge case "nạp bị ngắt giữa đường" | SR-005, FR-012 |

### 2.3 · Ánh xạ sang engine phi quan hệ

Bộ dữ liệu phải "tương đương về ý nghĩa" (FR-009), không phải giống hệt về hình dạng.

| Engine | Ánh xạ | Ghi chú |
|---|---|---|
| MongoDB | mỗi bảng → một collection cùng tên; FK → trường tham chiếu id; view → MongoDB view; `order_log` → 100.000 document | không nhồi JOIN; `types_probe` → document có `Long`, `Decimal128`, `BinData`, `Date`, `null` |
| Redis | `country`/`city`/`customer` → HASH theo khoá `corvus:dev:<entity>:<id>` · quan hệ → SET chỉ mục · `order_log` → 100.000 khoá HASH · marker → HASH `corvus:dev:marker` | không có view/routine/trigger → nhóm kiểm tra tương ứng **skip kèm lý do** (FR-023) |
| SQLite | đủ bảng và view; **không có** schema nên mọi thứ ở cấp tệp; routine/trigger: có trigger, không có stored function | `types_probe`: không có kiểu boolean/timestamptz gốc → dùng quy ước của engine |
| Oracle | schema = user; `NUMBER` thay `numeric`; `VARCHAR2`; không có `boolean` trước 23c → dùng `NUMBER(1)` | tên định danh mặc định chữ hoa → phần quoting phải khai riêng |
| SQL Server | `nvarchar` cho unicode; `datetimeoffset` cho timestamp có múi giờ; `varbinary` cho nhị phân | |
| MySQL / MariaDB | không có tầng schema → `corvus_dev` là **database** · `json` thay `jsonb` · `blob` thay `bytea` | MariaDB dùng lại y nguyên script MySQL |

---

## 3. Quy tắc hợp lệ (từ requirements)

| Quy tắc | Nguồn | Kiểm bằng |
|---|---|---|
| Nạp lại cùng script phải cho ra **cùng dữ liệu** (deterministic, idempotent) | FR-012 | seed dùng id và giá trị **cố định**, không dùng ngẫu nhiên không hạt giống, không dùng "thời điểm hiện tại" cho dữ liệu — `placed_at` sinh từ một mốc cố định + offset theo id |
| Dữ liệu mẫu là **chỉ đọc** với test | FR-021a | test làm việc trong `corvus_t_<id>`; thêm kiểm chứng đối chiếu tổng số dòng của `corvus_dev` trước và sau khi chạy suite |
| Tương đương ý nghĩa giữa các engine | FR-009 | một test đối chiếu: cùng câu hỏi nghiệp vụ ("số khách theo quốc gia") cho cùng kết quả trên mọi engine hỗ trợ |
| Không chứa dữ liệu cá nhân thật | SR-004 | tên/email sinh theo mẫu rõ ràng là bịa (`customer0001@example.invalid`) |
| Bảng 1M không tồn tại sau `up` mặc định | FR-011a | `doctor` báo có/không; test khẳng định không tồn tại ở trạng thái mặc định |

---

## 4. Chuyển trạng thái của môi trường

Đây là state machine duy nhất feature này thêm vào — `tools/devdb` quản.

```text
      (chưa có volume)
            │  up
            ▼
      KHỞI TẠO ─── lỗi giữa đường ──▶ DỞ DANG ──┐
            │ (marker chưa ghi)                  │  up (phát hiện marker thiếu)
            │ marker được ghi SAU CÙNG           │  → xoá volume, khởi tạo lại
            ▼                                    │
      SẴN SÀNG ◀──────────────────────────────────┘
        │  │  │
        │  │  └── bulk ──▶ SẴN SÀNG + bảng 1M ── bulk --drop ──▶ SẴN SÀNG
        │  └───── down ──▶ ĐÃ DỪNG (dữ liệu còn) ── up ──▶ SẴN SÀNG
        └──────── reset ─▶ KHỞI TẠO (xoá volume, seed lại)
```

| Trạng thái | Dấu hiệu nhận biết | Điều kiện để test chạy |
|---|---|---|
| KHỞI TẠO | container đang lên, `corvus_env_marker` **chưa** có | ❌ chặn, báo "đang khởi tạo" |
| DỞ DANG | container khoẻ nhưng marker thiếu hoặc `seed_version` lệch | ❌ chặn, yêu cầu `reset` |
| SẴN SÀNG | mọi engine khoẻ + marker đúng `seed_version` | ✅ |
| ĐÃ DỪNG | container không chạy | ❌ chặn, báo lệnh `up` (FR-020) |

`seed_version` tăng khi bộ seed thay đổi — đây là cơ chế duy nhất phát hiện "volume cũ, seed mới", trường hợp gây lỗi khó hiểu nhất khi làm việc lâu dài với volume bền vững.
