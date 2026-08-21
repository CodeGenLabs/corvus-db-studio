# Phase 1 — Quickstart: từ clone tới truy vấn dữ liệu thật trên 7 engine

**Branch**: `002-docker-real-env-testing` | **Date**: 2026-08-21 | **Plan**: [plan.md](./plan.md)

Tài liệu này là **đường đi mà SC-001 đo** (≤ 30 phút, chỉ dùng tài liệu, không hỏi ai). Nội dung ở đây sẽ trở thành phần tương ứng trong `README.md` khi hiện thực (FR-026, FR-027).

> ⚠️ Đây là **thiết kế**, chưa hiện thực. Các lệnh dưới đây chưa tồn tại trên nhánh này.

---

## 0 · Yêu cầu

| Mục | Giá trị |
|---|---|
| Docker | Desktop có Compose v2 |
| RAM cấp cho Docker | **8 GB** cho đủ 7 engine · 4 GB nếu chỉ chạy tập nhẹ |
| Dung lượng đĩa | ~12 GB cho image + ~1 GB volume (chưa tính bảng 1M) |
| Cổng cần rảnh | 5432 · 3306 · **3307** · **1434** · 1521 · 27017 · 6379 |
| Cổng **không** bị chạm | **1433** — SQL Server sẵn có của bạn |

---

## 1 · Cài đặt

```bash
pnpm install
```

## 2 · Bật môi trường database

```bash
pnpm db:up
```

Lệnh này: khởi động container → chờ mọi engine khoẻ → nạp phần seed mà image không tự nạp được (SQL Server, Redis) → ghi dấu hoàn tất. Lần đầu mất **≤ 5 phút** (SC-010a); Oracle là engine chậm nhất.

Chỉ cần một phần?

```bash
pnpm db:up -- --only postgres,mysql,redis
```

## 3 · Kiểm tra môi trường

```bash
pnpm db:doctor
```

In bảng: engine · cổng · khoẻ/không · phiên bản server thật · đã seed chưa · số dòng bảng mẫu. Đây là lệnh đầu tiên cần chạy khi có gì đó không đúng.

## 4 · Bảng kết nối

Tài khoản dưới đây **chỉ dùng cho môi trường phát triển local**. Không dùng lại ở bất kỳ đâu khác (SR-001).

| Engine | Phiên bản | Host | Cổng | Database / Namespace | User | Password | Connection string mẫu |
|---|---|---|---|---|---|---|---|
| PostgreSQL | 16 | 127.0.0.1 | 5432 | `corvus_dev` | `corvus` | `corvus_dev_pw` | `postgresql://corvus:corvus_dev_pw@127.0.0.1:5432/corvus_dev` |
| MySQL | 8.0 | 127.0.0.1 | 3306 | `corvus_dev` | `corvus` | `corvus_dev_pw` | `mysql://corvus:corvus_dev_pw@127.0.0.1:3306/corvus_dev` |
| MariaDB | 11.4 | 127.0.0.1 | **3307** | `corvus_dev` | `corvus` | `corvus_dev_pw` | `mariadb://corvus:corvus_dev_pw@127.0.0.1:3307/corvus_dev` |
| SQL Server | 2022 | 127.0.0.1 | **1434** | `corvus_dev` | `sa` | `Corvus_dev_pw1` | `sqlserver://sa:Corvus_dev_pw1@127.0.0.1:1434/corvus_dev` |
| Oracle | 23 Free | 127.0.0.1 | 1521 | `FREEPDB1` / user `CORVUS_DEV` | `CORVUS_DEV` | `corvus_dev_pw` | `oracle://CORVUS_DEV:corvus_dev_pw@127.0.0.1:1521/FREEPDB1` |
| MongoDB | 7 | 127.0.0.1 | 27017 | `corvus_dev` | `corvus` | `corvus_dev_pw` | `mongodb://corvus:corvus_dev_pw@127.0.0.1:27017/corvus_dev` |
| Redis | 7 | 127.0.0.1 | 6379 | *(prefix `corvus:dev:`)* | — | `corvus_dev_pw` | `redis://:corvus_dev_pw@127.0.0.1:6379` |
| SQLite | — | *(tệp)* | — | `.corvus-data/sample.sqlite` | — | — | *(chọn tệp trong app)* |

> Giá trị trong bảng này **được kiểm bằng máy** so với cấu hình thật (FR-028). Sửa một bên mà quên bên kia thì `pnpm verify` đỏ.

## 5 · Chạy ứng dụng trên dữ liệu thật

```bash
pnpm dev:web
```

Tạo kết nối mới trong app bằng đúng thông tin ở bảng trên, mở bảng `customer` hoặc `order_log` — đây là dữ liệu thật trong container, không phải mock.

Cần shell UI thuần với dữ liệu giả (chỉ để dựng giao diện)?

```bash
pnpm dev:mock
```

Chế độ này hiện **banner thường trực** cảnh báo dữ liệu là giả (FR-016a) và không tồn tại trong bản phát hành.

## 6 · Chạy test trên dữ liệu thật

```bash
pnpm test:it
```

Yêu cầu môi trường đang chạy. Nếu chưa chạy, lệnh **dừng ngay** kèm hướng dẫn — không treo, không báo xanh giả (FR-020).

Mỗi lần chạy làm việc trong không gian riêng `corvus_t_<id>` và xoá nó khi xong; bộ dữ liệu mẫu không bị chạm (FR-021, FR-021a).

## 7 · Bảng 1 triệu dòng (khi cần)

```bash
pnpm db:bulk            # sinh order_log_bulk (~1.000.000 dòng)
pnpm db:bulk -- --drop  # xoá đi
```

Không nằm trong `db:up` mặc định để giữ mốc 5 phút (FR-011a).

## 8 · Đặt lại / dừng

```bash
pnpm db:down    # dừng, GIỮ dữ liệu
pnpm db:reset   # xoá volume và seed lại từ đầu
```

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `port is already allocated` | cổng đã bị chiếm bởi engine cài trực tiếp trên máy | `pnpm db:doctor` cho biết cổng nào; đổi qua biến môi trường (FR-007) rồi cập nhật README |
| Oracle mãi không khoẻ | image nặng, lần đầu cần vài phút | đợi; nếu quá lâu, kiểm RAM cấp cho Docker (cần 8 GB cho đủ stack) |
| `pnpm test:it` báo cần khởi động môi trường | môi trường chưa chạy, hoặc ở trạng thái DỞ DANG | `pnpm db:doctor`; nếu DỞ DANG thì `pnpm db:reset` |
| Test đỏ với lỗi "không thấy dấu hiệu môi trường phát triển" | đang trỏ vào một database **không phải** của môi trường này | đây là **chốt an toàn** (SR-005) — kiểm lại host/cổng, đừng vô hiệu hoá nó |
| Số dòng bảng mẫu không đúng | volume cũ + seed mới (`seed_version` lệch) | `pnpm db:reset` |
| SQL Server của tôi ở 1433 có bị ảnh hưởng? | không | stack không map 1433; `pnpm verify` kiểm chứng điều này (FR-003a) |
