# Specification Quality Checklist: Kết nối toàn bộ workflow UI với DB thật & bộ kiểm thử UI chống hồi quy

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Vòng validation 1 — 2026-08-24

15/16 đạt. Còn 3 marker `[NEEDS CLARIFICATION]` (Q1 mức độ kiểm thử UI, Q2 ngưỡng nghiệm thu US4, Q3 phạm vi US5).

### Vòng validation 2 — 2026-08-24 (sau khi người dùng trả lời)

**16/16 đạt.** Ba câu hỏi đã được chốt và ghi vào mục Clarifications của spec:

| # | Quyết định | Thay đổi trong spec |
|---|---|---|
| Q1 | Kiểm thử **hai tầng** — tầng rộng phủ 7 engine (dựng UI trong môi trường kiểm thử, DB thật); tầng sâu điều khiển ứng dụng thật cho Luồng cốt lõi trên ≥2 engine | FR-017 viết lại, thêm FR-017B; FR-018 mở rộng cho cả hai tầng; FR-023 giới hạn về tầng rộng, thêm FR-023B cho tầng sâu; SC-006 viết lại |
| Q2 | **100%** — cả 46 năng lực còn treo phải có đường vào UI trong tính năng này | Thêm FR-026B; SC-010 đổi thành 76/76, ghi rõ "không hoãn nhóm nào" |
| Q3 | Bổ sung **4 công cụ di trú**: Data Transfer, Data Sync, Structure Sync, Dump/Execute SQL. Khoảng trống còn lại chỉ vào hàng đợi | US5 viết lại thành story P2 về bộ công cụ Tools; tách US6 (P3) cho hàng đợi; FR-037…FR-041 mới; FR-042/FR-043 thay cho FR-037/FR-038 cũ; thêm SC-013, SC-014; Out of Scope viết lại; bảng B.5 chương 14 đánh dấu vào phạm vi |

### Vòng validation 3 — 2026-08-24 (`/speckit.clarify` — menu chuột phải)

**16/16 vẫn đạt.** 5 câu hỏi được hỏi và trả lời, ghi thành 5 bullet `- Q: … → A: …` trong mục Clarifications.

| # | Câu hỏi | Đáp án | Thay đổi trong spec |
|---|---|---|---|
| Q1 | Bề mặt nào có context menu | **Toàn bộ 11 bề mặt** (3 cốt lõi + 3 soạn thảo/canvas + 5 phụ) | Thêm bảng kiểm kê S-01…S-11 |
| Q2 | Story riêng hay tiêu chí của từng lệnh | **Tiêu chí Definition-of-Done của từng lệnh**, không tách story | FR-010 mở rộng (khai báo tập bề mặt); FR-025 thành kiểm kê ba chiều; thêm FR-025B, nhóm FR-044…FR-049 |
| Q3 | Lệnh không khả dụng: ẩn hay vô hiệu hoá | **Theo lý do** — ẩn khi engine không hỗ trợ, vô hiệu hoá kèm lý do khi ngữ cảnh chưa đủ | FR-046 viết lại (một quyết định, hai cách trình bày); thêm FR-046B; A-03 sửa để không mâu thuẫn |
| Q4 | Multi-select | **Chỉ tập lệnh khai báo rõ** (Maintain, Drop, Export, chọn đối tượng cho Data Transfer / Import-Export) | FR-001 đổi thành "tập đối tượng đang chọn"; thêm FR-050…FR-052; thêm 3 edge case |
| Q5 | Mở bằng bàn phím | **Có, cả 11 bề mặt** (Menu key + `Shift+F10`); ARIA đầy đủ ngoài phạm vi | Thêm FR-047B, FR-025C |

Phát hiện mới trong lúc rà soát, đã ghi thành **C-19** và **C-20**: hai component context menu (`ObjectContextMenu`, `CellContextMenu`) cùng `DdlPartialFailureDialog` đã tồn tại và được export ra ngoài, nhưng `onContextMenu` trong **toàn repo bằng 0** — code chết. Chúng còn hard-code chuỗi tiếng Việt và hex màu, vi phạm hệ i18n và `ui-rules` mục 1.1.

Bổ sung: SC-015, SC-016; US2 thêm 3 acceptance scenario cho context menu; Key Entities thêm **Bề mặt lệnh** và mở rộng **Lệnh giao diện**.

### Luồng cốt lõi do người dùng chỉ định

Người dùng nêu rõ mục tiêu cao nhất: kết nối được → viết SQL → chạy/thực thi → sửa dữ liệu → nhập/xuất dữ liệu → bộ công cụ Tools (Data Transfer, Data Sync…). Sáu luồng này được ghi thành **L-1…L-6** trong mục Clarifications và trở thành:

- thứ tự ưu tiên nghiệm thu tuyệt đối,
- phạm vi của tầng kiểm thử sâu (FR-017B, FR-023B),
- điều kiện của SC-014.

Hệ quả cho giai đoạn lập kế hoạch: US5 được **nâng từ P3 lên P2** (ngang US4) vì L-6 thuộc mục tiêu cao nhất; US6 mới giữ P3.

### Ghi chú về các quyết định đã tự chốt (không đưa vào clarification)

- Phạm vi 7 engine → A-01 (đã có driver và seed sẵn).
- Tái dùng hạ tầng Docker/seed hiện có → A-02.
- Lệnh không khả dụng thì **vô hiệu hoá kèm lý do** thay vì ẩn; riêng nhóm loại đối tượng engine không có thì ẩn → A-03.
- Bộ dữ liệu 1 triệu dòng chỉ nạp theo yêu cầu → A-07.
- Navicat là tham chiếu chức năng, không sao chép giao diện → A-08.

### Điều kiện chuyển tiếp

Spec đã sẵn sàng cho `/speckit.plan`. Hai điểm cần quyết ở giai đoạn kế hoạch (đúng chỗ, không thuộc spec):

- **D-04** — chọn công cụ điều khiển UI cho cả hai tầng kiểm thử (tầng rộng và tầng sâu có thể dùng công cụ khác nhau).
- Chọn cụ thể 2 engine cho tầng kiểm thử sâu (cần một engine có schema và một engine không có, theo FR-017B).
