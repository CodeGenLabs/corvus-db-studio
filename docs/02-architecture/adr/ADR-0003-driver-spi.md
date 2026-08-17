# ADR-0003: Driver SPI với CapabilitySet khai báo

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: [driver-spi.md](../driver-spi.md), [capability-matrix.md](../capability-matrix.md)

## Bối cảnh

Hỗ trợ 7–8 database engine khác nhau sâu sắc: PostgreSQL có schema và materialized view,
MySQL không; SQLite không `ALTER COLUMN`; MongoDB không có SQL; Redis không có bảng.

Nguy cơ lớn nhất của loại sản phẩm này là **`if (driverId === …)` lan ra khắp UI**. Sau 2 năm
sẽ có hàng nghìn nhánh như vậy, thêm engine mới trở thành bất khả thi, và mỗi engine đều có
lỗi riêng vì bị bỏ sót một nhánh nào đó.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| Nhánh theo `driverId` trực tiếp trong UI | Đơn giản lúc đầu | Nợ kỹ thuật cấp số nhân; thêm engine = sửa hàng trăm file |
| Kế thừa OOP: `BaseDriver` → `PostgresDriver` | Gom được code chung | Vấn đề vẫn còn ở tầng UI; kế thừa sâu khó hiểu; MongoDB/Redis không vừa hình dạng cha |
| **Khai báo capability + SPI phẳng** | UI chỉ đọc dữ liệu, không nhánh theo tên; thêm engine không đụng UI; test được bằng bộ conformance chung | Phải thiết kế `CapabilitySet` cẩn thận từ đầu; capability sai = UI hiện sai |

## Quyết định

Mỗi driver hiện thực interface `DatabaseDriver` phẳng và **khai báo** một `CapabilitySet`.
UI và services chỉ được rẽ nhánh theo capability, không bao giờ theo `driverId`.

Ép bằng máy: ESLint rule `corvus/no-driver-id-branching` chặn mọi so sánh `driverId === '…'`
trong `packages/ui` và `packages/services` (trừ `packages/driver-*` và bảng đăng ký).

Capability trả về là của **connection** (đã thu hẹp theo version server thật), không phải
của driver tĩnh.

## Hệ quả

### Tích cực
- Thêm engine mới = 1 package + 1 cột trong capability matrix. Không đụng UI.
- Vượt `driver-conformance-suite` là điều kiện khách quan để tuyên bố "hỗ trợ engine X".
- UI ẩn/vô hiệu hoá chức năng đúng cách thay vì để người dùng bấm rồi gặp lỗi server.

### Tiêu cực / cái giá
- `CapabilitySet` sẽ phình ra theo thời gian (dự kiến 60–100 cờ ở v1.0). Chấp nhận được: nó là
  dữ liệu, dễ đọc, dễ test.
- Có những khác biệt không quy về cờ boolean được (cú pháp `ALTER` của từng engine). Những chỗ
  đó nằm trong `DdlGenerator` của driver — đúng chỗ, không rò ra ngoài.
- Cửa thoát hiểm `connection.extension(name)` cho tính năng độc nhất (Redis MONITOR, Mongo
  aggregate). Dùng có kiểm soát: mỗi extension phải có capability cờ tương ứng để UI biết mà hỏi.

### Việc phải làm kèm theo
- `T-020` Định nghĩa `CapabilitySet` đầy đủ trong `@corvus/contract`.
- `T-021` Viết ESLint rule `no-driver-id-branching`.
- `T-022` Dựng `driver-conformance-suite` với 9 nhóm test.
- Khi thêm cờ capability mới: cập nhật đồng thời `capability-matrix.md` và **tất cả** driver.
