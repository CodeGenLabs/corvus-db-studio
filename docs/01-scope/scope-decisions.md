# Scope Decisions — Làm gì, không làm gì, và vì sao

## 1. Thực tế về quy mô (đọc trước tiên)

Navicat Premium là sản phẩm ~20 năm tuổi, hàng trăm người-năm công sức. **Không có kế hoạch
nào biến nó thành một sprint.** Tài liệu này cố tình *không* hứa "parity 100% trong X tháng".

Cam kết thay vào đó:

> Mỗi wave phát hành một tập tính năng **chạy thật, dùng được trong production**, không phải
> demo. Người dùng cuối wave N có thể làm công việc thật với những gì wave N cung cấp.

Wave 0–3 (≈6 tháng, 4 kỹ sư) đã đủ thay thế Navicat cho **80% công việc hằng ngày** của một
backend developer: kết nối, duyệt schema, xem/sửa dữ liệu, chạy SQL, thiết kế bảng, import/export,
backup/restore.

## 2. Nguyên tắc cắt scope

| Nguyên tắc | Diễn giải |
|---|---|
| **P1. Chiều sâu trước chiều rộng** | MySQL + PostgreSQL hoàn chỉnh > 8 engine hời hợt. |
| **P2. Web là công dân hạng nhất** | Tính năng nào không chạy được trên web thì phải có phương án thay thế, không được để web thành bản què. |
| **P3. Không tính năng phá huỷ nào chạy mà không xem trước** | Mọi DDL/DML sinh tự động phải hiển thị SQL trước khi thực thi. |
| **P4. Không sao chép Navicat** | Không lấy code, icon, chuỗi văn bản, layout pixel-perfect. Chỉ lấy *danh mục chức năng nghiệp vụ*. |
| **P5. Không xây engine từ đầu khi đã có thư viện tốt** | Dùng `mysql2`, `pg`, CodeMirror, ECharts… thay vì tự viết. |

## 3. Không làm — và lý do

| Tính năng | Lý do loại |
|---|---|
| **HTTP Tunnel** (upload script PHP/ASP lên server) | Mô hình bảo mật lỗi thời, bề mặt tấn công lớn. Thay bằng SSH tunnel + deploy Corvus engine trong VPC. |
| **ODBC / MS Access / DBF import** | Phụ thuộc driver Windows đóng, không chạy được trên web/Linux/container. Người dùng chuyển sang CSV. |
| **Oracle PL/SQL Debugger** | Cần OCI debug API độc quyền, chi phí cực cao, thị trường rất hẹp. |
| **Data Vault modeling** (hub/link/satellite/PIT/bridge) | Ngách hẹp; dựng sau nếu có nhu cầu thực. |
| **Navicat Cloud** | Không tái tạo dịch vụ đám mây của bên thứ ba. Corvus dùng self-hosted sync server. |
| **Windows Task Scheduler integration** | Phá vỡ tính đa nền tảng. Thay bằng scheduler nội bộ (`node-cron`) chạy giống nhau ở cả 3 target. |
| **Big Icons / caption toolbar toggle** | Chi tiết UI cổ, không cần thiết. |

## 4. Thứ tự hỗ trợ engine

| Đợt | Engine | Driver npm | Ghi chú |
|---|---|---|---|
| W0 | **PostgreSQL** | `pg` | Chọn làm engine tham chiếu — dialect chuẩn nhất, introspection giàu nhất |
| W0 | **MySQL / MariaDB** | `mysql2` | Thị phần lớn nhất |
| W0 | **SQLite** | `better-sqlite3` | Test nhanh, không cần server, dùng luôn cho `workspace.db` |
| W6 | **SQL Server** | `mssql` (tedious) | |
| W7 | **MongoDB** | `mongodb` | Mô hình dữ liệu khác hẳn → cần view riêng |
| W7 | **Redis** | `ioredis` | |
| W8 | **Oracle** | `oracledb` (thin mode) | Thin mode để tránh phụ thuộc Instant Client |
| W9 | Snowflake, GaussDB, Dameng | | Chỉ khi có khách hàng thật yêu cầu |

**Quy tắc**: một engine chỉ được đánh dấu "hỗ trợ" khi vượt qua **toàn bộ** bộ
`driver-conformance-suite` (xem [testing-strategy.md](../04-plan/testing-strategy.md)).

## 5. Ranh giới web vs desktop

Ba tính năng **không thể** giống hệt nhau ở hai target. Xử lý như sau:

| Tính năng | Desktop | Web | Cách hoà giải |
|---|---|---|---|
| Truy cập file cục bộ (import nguồn, đích export, file SQLite) | Đọc/ghi trực tiếp qua dialog OS | Upload / download qua trình duyệt | Interface `FileGateway` với 2 hiện thực; UI luôn gọi `FileGateway`, không gọi `fs` |
| Kết nối tới `localhost` của người dùng | Được (engine chạy trên máy họ) | Không (engine chạy trên server) | Web hiển thị cảnh báo rõ ràng + tài liệu hướng dẫn dùng **Corvus Agent** (engine chạy local, UI web kết nối vào) |
| Job chạy nền khi đóng cửa sổ | Cần chế độ "chạy nền" (tray) hoặc bỏ | Server luôn chạy → tự nhiên | Desktop mặc định giữ tray process; có thể tắt trong Settings |

Chi tiết: [ADR-0009](../02-architecture/adr/ADR-0009-web-desktop-parity.md).

## 6. Điều kiện coi là "tính năng chạy thật"

Một mục trong feature inventory chỉ được đánh ✅ khi **tất cả** điều sau đúng:

1. Có SPEC với đủ FR được đánh số.
2. Hoạt động với **ít nhất 2 engine** (trừ tính năng đặc thù một engine).
3. Có unit test + integration test chạy trên DB thật (testcontainers).
4. Có E2E test trên **cả web build và desktop build**.
5. Xử lý được: dữ liệu rỗng, dữ liệu rất lớn (≥1 triệu dòng), mất kết nối giữa chừng, huỷ giữa chừng.
6. Có i18n đủ 3 ngôn ngữ (vi/en/ja).
7. Có mục trong tài liệu người dùng.

Không đủ 7 điều → trạng thái là 🟡 partial, **không được tính vào tiêu chí ra wave**.
