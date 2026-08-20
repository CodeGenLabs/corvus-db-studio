# Phase 1 · Quickstart: dựng môi trường và kiểm bằng tay

**Branch**: `001-multi-engine-navigation` | **Date**: 2026-08-20

Mục tiêu: người khác dựng lại được từ máy trắng và chạy được bộ kiểm trong **≤ 10 phút**
(SC-014). Mọi lệnh dưới đây chạy từ gốc repo.

---

## 0. Quy tắc về mật khẩu — đọc trước khi làm

**Không có mật khẩu nào được ghi vào repo** (SR-006), kể cả mật khẩu container cá nhân. Ba đường
hợp lệ:

| Trường hợp | Mật khẩu lấy từ đâu |
|---|---|
| Bộ kiểm tự động (conformance) | testcontainers **tự sinh** trong lần chạy đó |
| Thử tay với container do bạn tự dựng | biến môi trường trong shell của bạn |
| Thử tay với container sẵn có trên máy | biến môi trường; **không** dán vào tệp nào trong repo |

Nếu bạn thấy một mật khẩu trong bất kỳ tệp nào của repo, đó là lỗi cần sửa ngay, không phải
tiện lợi.

---

## 1. Cổng xác minh cơ bản

```bash
pnpm install
pnpm verify > verify.log 2>&1; echo $?
```

Phải in `0`. **Đừng** dùng `pnpm verify | tail -50` — shell sẽ lấy exit code của `tail` và báo
0 dù verify đỏ. Lỗi này đã xảy ra thật và từng che một lượt lint đỏ.

Mốc hiện tại (2026-08-20): 20 test file · 262 pass + 2 skip · 0 lint error.

---

## 2. Kiểm phần không cần Docker

Phần lớn công việc của feature này (bảng khai báo, cây, tab) kiểm được **không cần container**:

```bash
npx vitest run packages/ui                  # cây + tab + bảng ánh xạ
npx vitest run packages/driver-sqlite       # conformance SQLite, không cần Docker
npx vitest run packages/contract            # hợp đồng
```

SQLite được chọn làm engine kiểm nhanh chính vì lý do này — mỗi lần chạy test đều kiểm lại rằng
SPI thật sự trung lập engine.

---

## 3. Kiểm với database thật (cần Docker)

```bash
docker version                              # phải trả về Server Version
pnpm test:it > it.log 2>&1; echo $?
```

Bộ này tự dựng và tự dọn container. Mốc hiện tại: postgres 79 · mysql 64 · engine 27 · web 29.

---

## 4. SQL Server: môi trường cho bộ kiểm tự động

**Ảnh dùng: SQL Server đầy đủ, KHÔNG dùng Azure SQL Edge.**

```bash
# Kéo trước để lần chạy đầu không hết thời gian chờ (~1.5 GB)
docker pull mcr.microsoft.com/mssql/server:2022-latest

pnpm --filter @corvus/driver-mssql test:integration > mssql.log 2>&1; echo $?
```

Testcontainers tự dựng container, tự sinh mật khẩu, tự tạo database riêng cho bộ kiểm, và tự
dọn. Không cần cấu hình gì.

**Vì sao không dùng container Edge sẵn có cho việc này** — hai lý do, cả hai đã kiểm:

1. `mcr.microsoft.com/azure-sql-edge` là **bản rút gọn** của engine. Kết luận "driver SQL Server
   chạy được" dựa trên nó là kết luận quá mức. Nếu vì lý do thời gian mà phải dùng Edge, báo cáo
   kiểm **bắt buộc** ghi rõ giới hạn đó (FR-030).
2. Container Edge trên máy phát triển đang giữ database nghiệp vụ của một ứng dụng thật.
   Conformance **tạo và xoá bảng** để dựng lược đồ mẫu.

Bảo vệ: bộ kiểm **từ chối chạy** nếu database đích không phải database do chính nó tạo
(SR-007, FR-029). Đây không phải cảnh báo — nó dừng lại.

---

## 5. SQL Server: thử tay với container tự dựng

```bash
export MSSQL_TEST_PASSWORD='...'   # tự đặt, KHÔNG ghi vào tệp nào trong repo

docker run -d --name corvus-mssql \
  -e ACCEPT_EULA=Y \
  -e "MSSQL_SA_PASSWORD=$MSSQL_TEST_PASSWORD" \
  -p 14330:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

Cổng **14330** cố ý khác 1433 để không đụng container đang chạy trên máy.

Tạo kết nối trong app: host `127.0.0.1`, port `14330`, user `sa`, mật khẩu nhập trong dialog
(nó vào SecretVault, không vào tệp cấu hình).

⚠ Container này dùng **chứng chỉ tự ký**. Sản phẩm mặc định `trustServerCertificate: false` và
**không có** tuỳ chọn UI để bỏ qua kiểm chứng chỉ — cùng nguyên tắc với SSH host key. Để thử
tay, đặt cờ tin cậy qua biến môi trường của môi trường phát triển, đừng nới mặc định của sản phẩm.

---

## 6. SQL Server: dùng container sẵn có trên máy (chỉ để xem UI)

Nếu bạn đã có một container SQL ở cổng 1433 và chỉ muốn xem cây/tab hoạt động:

```bash
docker ps --format '{{.Names}} | {{.Image}} | {{.Ports}}'
```

Tạo kết nối trỏ tới nó, nhưng **tạo một database riêng để thử**:

```sql
CREATE DATABASE corvus_thu_nghiem;
```

**Tuyệt đối không** trỏ bộ kiểm vào database nghiệp vụ đang có trên đó. Xem lại mục 4 lý do 2.

---

## 7. Kiểm bằng mắt luồng điều hướng

```bash
pnpm dev:web
```

Rồi mở `http://localhost:5173` và đi đúng thứ tự này — đây là các tiêu chí của spec, không phải
"nhìn qua cho có:

| # | Việc làm | Phải thấy | Tiêu chí |
|---|---|---|---|
| 1 | Mở app | vùng trái **chỉ** có tên các kết nối, tất cả đóng; console không có truy vấn database nào | FR-001, FR-002, SC-001 |
| 2 | Nhấn một kết nối | chỉ hiện database; **chưa** nạp schema/bảng nào | FR-004 |
| 3 | Bung tới nhóm | chỉ những nhóm mà engine thật sự có; SQLite không có "Procedures" | FR-010, SC-005 |
| 4 | Nhấn một bảng | bên phải mở tab dữ liệu của **đúng** bảng đó, có đường dẫn đầy đủ | FR-014, FR-016 |
| 5 | Nhấn bảng thứ hai | **tab mới**, tab cũ còn nguyên | FR-014b, SC-011 |
| 6 | Nhấn lại bảng thứ nhất | **không** mở tab thứ ba; tiêu điểm về tab cũ | FR-014c |
| 7 | Nhấn một function | tab hiện **định nghĩa**, không phải màn hình trắng | FR-015 |
| 8 | Mở trình soạn SQL, gõ gì đó, rồi chọn bảng khác bên trái | nội dung đang soạn **không mất** | FR-019, SC-012 |
| 9 | Chỉ dùng bàn phím: mũi tên di chuyển/bung/đóng, Enter mở | đi được hết cây, tiêu điểm luôn thấy được | Constitution X |
| 10 | Kết nối chỉ đọc | badge thấy được ở cả hai vùng; **không** hành động ghi nào được chào mời | FR-020, SC-010 |
| 11 | Ngắt mạng rồi bung một nhánh | lỗi hiện **tại nhánh đó**, các nhánh khác còn nguyên | FR-005 |

Mục 6 và 8 là hai mục dễ bị bỏ nhất và cũng là hai mục dễ hỏng nhất khi sửa mô hình tab.

---

## 8. Khi có gì đỏ

| Hiện tượng | Chỗ xem trước |
|---|---|
| Bung nhánh báo `INVALID_INPUT` | enum `introspect.objects.kind` chưa mở rộng — xem contracts/introspect-object-kind.md C-2 |
| Nhánh hiện nhưng luôn rỗng | driver khai capability `true` mà `listObjects` không trả loại đó — bất biến IV-A |
| Hai bảng trùng tên mở/đóng cùng nhau | `path` không đủ phân biệt — bất biến IV-B |
| Chọn lại một bảng mở thêm tab | so danh tính tab sai — bất biến IV-F |
| SQLite không thấy database đã ATTACH | ODQ-1 chưa chốt (`hasCatalogs: false`) — xem research.md |
| Test SQL Server treo ở lần chạy đầu | chưa `docker pull` trước; ảnh ~1.5 GB |
| Test SQL Server báo từ chối chạy | đích không phải database do bộ kiểm tạo — đúng như thiết kế (SR-007) |
