# Bảng đối chiếu năng lực tính năng (Navicat Feature Parity)

Tài liệu này theo dõi trạng thái đối chiếu năng lực giữa Corvus DB Studio và bộ tính năng tham chiếu (Navicat Premium 17).

## 1. Trạng thái các luồng cốt lõi (Core Workflows L-1 → L-6)

| Mã | Tên Luồng | Trạng thái | Ghi chú kỹ thuật |
|---|---|---|---|
| **L-1** | Vòng đời kết nối (Connection Lifecycle) | ✅ ĐÃ CÓ (100%) | Đã qua 7 engine, mã hoá an toàn mật khẩu, parsing URI, nhân bản và xoá profile qua RPC |
| **L-2** | Trình soạn thảo SQL (SQL Editor) | ✅ ĐÃ CÓ (100%) | Đầy đủ định dạng, ngắt câu lệnh, gợi ý và phân tích cú pháp `query.parse` |
| **L-3** | Thực thi truy vấn và xem kết quả | ✅ ĐÃ CÓ (100%) | Luồng stream kết quả, phân trang tự động, hỗ trợ `query.cancel` an toàn ở phía server |
| **L-4** | Chỉnh sửa dữ liệu & Giao dịch | ✅ ĐÃ CÓ (100%) | Lưới dữ liệu DataGrid hỗ trợ sửa trực tiếp, `tx.begin`, `tx.commit`, `tx.rollback`, `tx.status`, tra cứu khoá ngoại `data.fkLookup` |
| **L-5** | Nhập / Xuất dữ liệu & Quản trị DDL | ✅ ĐÃ CÓ (100%) | `ImportWizard`, `ExportWizard` kết nối qua RPC file stream an toàn; `ddl.preview*` / `ddl.apply*` tuân thủ Preview Token |
| **L-6** | Bộ công cụ di trú (Data Migration Tools) | ✅ ĐÃ CÓ (100%) | `DataTransferWizard`, `DataSyncWizard`, `StructureSyncWizard`, `DumpExecuteSqlWizard` chạy qua RPC `job.*` |

---

## 2. Hàng đợi tính năng mở rộng (Feature Backlog & Out of Scope)

Toàn bộ các tính năng tương lai khi triển khai bắt buộc phải tuân thủ:
1. **Engine Capability Gating**: FR-010…FR-016 (Gating dựa trên `CapabilitySet`, không rẽ nhánh theo engine).
2. **Kiểm thử đa tầng**: FR-017…FR-025C (Kiểm thử DOM jsdom + E2E Playwright trên Docker database).
3. **Preview Token**: ADR-0010 & Rule 5 (Mọi thao tác thay đổi dữ liệu hoặc cấu trúc phải hiển thị câu lệnh SQL trước khi thực thi).

| Tính năng | Trạng thái | Mức ưu tiên | Lý do / Kế hoạch triển khai |
|---|---|---|---|
| **Data Profiling & Statistics** | Trong hàng đợi | P3 | Phân tích phân phối dữ liệu, tần suất giá trị NULL, độ lệch |
| **PL/SQL & Stored Routine Debugger** | Trong hàng đợi | P4 | Yêu cầu giao thức debug chuyên biệt cho PostgreSQL / Oracle / SQL Server |
| **MongoDB Aggregation Pipeline Builder** | Trong hàng đợi | P3 | Trình dựng pipeline trực quan cho NoSQL MongoDB |
| **Redis Pub/Sub & Key Monitoring** | Trong hàng đợi | P3 | Giao diện theo dõi channel thời gian thực |
| **Test Data Generation** | Trong hàng đợi | P3 | Sinh dữ liệu mẫu theo luật ràng buộc và phân phối thống kê |
| **Data Dictionary Export (PDF / HTML / Markdown)** | Trong hàng đợi | P3 | Xuất từ điển dữ liệu schema thành tài liệu |
| **Business Intelligence (BI) Charts & Dashboards** | Trong hàng đợi | P4 | Trực quan hoá biểu đồ từ kết quả truy vấn SQL |
| **Cloud Synchronization / Collaboration** | Ngoài phạm vi | N/A | Corvus DB Studio ưu tiên kiến trúc Offline-first / Local-first, không lưu trữ credential trên đám mây |
