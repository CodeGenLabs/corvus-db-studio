# ADR-0006: SQLite cho workspace thay vì file JSON

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: [workspace-storage.md](../workspace-storage.md)

## Bối cảnh

Cần lưu: profile kết nối, query đã lưu, snippet, model, batch job, lịch chạy, lịch sử, audit
log, cài đặt. Ở web còn có nhiều người dùng ghi đồng thời.

Navicat dùng nhiều file rời (`.ncx`, `.nsatmongodb`, `vgroup.json`, registry Windows).

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| File JSON rời | Đơn giản, đọc được bằng mắt, diff bằng git | Không có giao dịch → ghi dở là hỏng. Không truy vấn được ("query nào chạy tuần trước?"). Nhiều người ghi đồng thời = hỏng. Audit log 100 MB không hợp với JSON. |
| LevelDB / LMDB | Nhanh, nhúng được | Không truy vấn được; phải tự làm index; công cụ debug kém |
| PostgreSQL nhúng | Mạnh | Không nhúng được vào desktop; thêm một service phải vận hành |
| **SQLite** | Giao dịch ACID; truy vấn SQL; một file; WAL cho đọc song song; công cụ debug sẵn (chính Corvus mở được); chạy giống hệt ở desktop và server | Ghi đồng thời hạn chế (một writer); cần chiến lược migration |

## Quyết định

Một file **SQLite** (`workspace.db`), chế độ WAL, kèm thư mục file phụ cho artifact lớn
(backup, log, model).

Điểm cộng đặc biệt: **Corvus đã có driver SQLite**. Người dùng nâng cao có thể mở chính
`workspace.db` bằng Corvus để chẩn đoán — công cụ tự soi được chính mình.

## Hệ quả

### Tích cực
- Cấu hình hỏng nửa chừng là không thể xảy ra (giao dịch).
- Query history và audit log truy vấn được, lọc được, phân trang được.
- Sao lưu workspace = copy một file.
- Migration có kỷ luật (bảng `schema_migration` + checksum).
- Cùng một mã lưu trữ cho cả desktop và web.

### Tiêu cực / cái giá
- Một writer duy nhất → server web phải tập trung ghi qua `StorageService` trong process chính.
  Không được mount qua NFS.
- Người dùng không sửa cấu hình bằng text editor được nữa. Bù lại: có
  `corvus workspace export/import` ra JSON.
- Phụ thuộc native `better-sqlite3` → phải rebuild cho Electron (xem
  [packaging-release.md](../packaging-release.md) §2).

### Việc phải làm kèm theo
- `T-025` `@corvus/storage` + migration runner có checksum.
- `T-026` Tự sao lưu `workspace.db` trước mỗi lần migrate.
- `T-027` `corvus workspace export/import` định dạng `.corvusws`.
- `T-028` Từ chối khởi động khi `user_version` mới hơn phiên bản app.
