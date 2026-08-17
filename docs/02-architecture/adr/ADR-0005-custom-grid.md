# ADR-0005: Tự viết DataGrid thay vì dùng thư viện grid

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: SPEC-03, [streaming-and-jobs.md](../streaming-and-jobs.md)

## Bối cảnh

DataGrid là thành phần được dùng nhiều nhất và khó nhất của sản phẩm. Nó xuất hiện ở 5 chỗ:
Data Editor, Query Results, Compare A⇄B, Users dialog, Backup history.

Yêu cầu:
- Ảo hoá hai chiều (hàng và cột), 1 triệu dòng ở 55 fps (NFR-02)
- Sửa cell tại chỗ với editor theo kiểu dữ liệu
- Chọn vùng cell, sao chép ra TSV / Insert / Update statement
- Đổi rộng cột, ẩn/hiện cột, đóng băng cột
- Ô NULL hiển thị khác ô chuỗi rỗng (khác biệt có ý nghĩa với DB)
- Bám sát design system pixel-level (đường lưới, mật độ dòng 23/28 px, màu theo biến CSS)
- Nạp dữ liệu tăng dần theo chunk từ stream

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược |
|---|---|---|
| **AG Grid** | Đầy đủ nhất, ảo hoá tốt | Bản Enterprise mới có tính năng cần; giấy phép thương mại đắt; ~500 KB; theming cưỡng ép; API rất lớn |
| **TanStack Table** | Headless, linh hoạt, type-safe | Chỉ là logic bảng, **không** có ảo hoá và không có render — vẫn phải tự viết phần khó |
| **Glide Data Grid** | Vẽ bằng canvas, cực nhanh | Canvas → không dùng được biến CSS, không accessible, chọn text khó, khó khớp design |
| **Tự viết trên `@tanstack/virtual`** | Kiểm soát hoàn toàn; DOM thật → CSS variable + a11y hoạt động; chỉ chở đúng tính năng cần | Phải tự viết ~1 500 dòng; tự chịu trách nhiệm hiệu năng |

## Quyết định

Tự viết `packages/ui/src/grid/DataGrid.tsx` dựa trên `@tanstack/react-virtual` cho ảo hoá,
DOM thật (không canvas).

Ba lý do:
1. **Theming**: design system dựa trên biến CSS đổi lúc chạy. Canvas không đọc được biến CSS;
   AG Grid cần lớp dịch theme.
2. **Semantic dữ liệu**: NULL vs chuỗi rỗng vs BLOB bị cắt vs giá trị lỗi — không grid nào có
   sẵn khái niệm này. Ta cần render từ `CellValue` (xem driver-spi §6).
3. **Giấy phép**: tính năng cần của AG Grid nằm sau bản Enterprise.

## Hệ quả

### Tích cực
- Một component dùng lại ở cả 5 chỗ, hành vi nhất quán.
- Hiệu năng nằm trong tầm kiểm soát; tối ưu được đúng chỗ nghẽn của ta.
- Không phụ thuộc giấy phép thương mại.
- Accessibility làm được (row/cell có role ARIA, điều hướng bàn phím).

### Tiêu cực / cái giá
- Khoảng 2 person-week để đạt chất lượng sản xuất, cộng bảo trì liên tục.
- Phải tự viết test hiệu năng (benchmark trong CI, phát hiện tụt fps).
- Rủi ro: dễ đánh giá thấp độ khó. Giảm thiểu bằng cách làm `DataGrid` **rất sớm** (W1) và
  dùng nó ở nhiều nơi ngay để lộ vấn đề.

### Việc phải làm kèm theo
- `T-030` `DataGrid` lõi: ảo hoá, đổi rộng cột, chọn vùng.
- `T-031` Cell editor theo kiểu dữ liệu.
- `T-032` Nạp tăng dần từ `AsyncIterable<ResultChunk>` + ring buffer.
- `T-033` Copy/paste TSV + Insert/Update statement.
- `T-034` Benchmark trong CI: 1 triệu dòng ≥ 55 fps, cảnh báo khi tụt.
