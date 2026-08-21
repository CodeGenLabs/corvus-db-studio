# Specification Quality Checklist: Môi trường DB thật trên Docker & loại bỏ mockup

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-21
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

### Vòng kiểm định 1 (2026-08-21) — 4 mục fail, đã sửa

| Mục | Vấn đề | Đã sửa |
|---|---|---|
| No implementation details | Bản nháp ban đầu đặt tên file cụ thể (`docker-compose.db.yml`), tên biến môi trường, tên script npm trong phần Requirements | Đã chuyển sang mô tả năng lực ("một lệnh duy nhất", "cấu hình được qua biến môi trường"). Tên file / dòng cụ thể chỉ còn ở mục **Bối cảnh rà soát** làm bằng chứng hiện trạng, không nằm trong FR |
| Success criteria measurable | SC ban đầu có "test nhanh hơn" và "tài liệu đầy đủ" không đo được | Đã định lượng: SC-006 ≥ 60%, SC-001 ≤ 30 phút, SC-008 7/7 engine, SC-010/SC-011 100% |
| Scope clearly bounded | Thiếu ranh giới với benchmark, E2E, nâng cấp engine | Đã thêm mục **Out of Scope** với 6 gạch đầu dòng |
| Dependencies identified | Không nêu điều kiện cổng 1433 đã bị chiếm và yêu cầu tài nguyên | Đã thêm mục **Dependencies** + Assumption 2, 3 và FR-003 |

### Ghi chú về ngoại lệ có chủ ý

Mục **Bối cảnh: kết quả rà soát mã nguồn hiện tại** (A-01…A-10) có dẫn đường dẫn file và số dòng.
Đây là **bằng chứng hiện trạng** người dùng yêu cầu trực tiếp ("kiểm tra lại toàn bộ source code"),
không phải chỉ dẫn hiện thực. Giữ lại vì `docs/04-plan/definition-of-done.md` và bài học từ
`docs/04-plan/audit-2026-08-18.md` yêu cầu mọi tuyên bố hiện trạng phải kèm bằng chứng kiểm chứng được.

### Không có [NEEDS CLARIFICATION]

Ba điểm từng mơ hồ đã chốt bằng suy luận có căn cứ (ghi ở mục **Assumptions**) thay vì hỏi lại:

1. **Cổng cho các engine ngoài SQL Server** → dùng cổng mặc định engine; MariaDB cần cổng riêng vì trùng họ MySQL (sau đó chốt = 3307 ở vòng clarify).
2. **Giữ hay xoá `transport-mock`** → giữ cho unit test giao diện, chỉ loại khỏi đường mặc định (FR-017, Assumption 5).
3. **Testcontainers vs stack cố định** → giữ cả hai, dùng chung một bộ dữ liệu mẫu; local ưu tiên stack cố định, CI dùng testcontainers (Assumption 6).

---

## Vòng clarify (2026-08-21) — 5/5 câu, tất cả đã áp vào spec

| # | Câu hỏi | Trả lời | Hạng mục taxonomy | Mục spec đã sửa |
|---|---|---|---|---|
| Q1 | `pnpm dev` (UI shell mock) trở thành gì? | Nối engine thật; mock tách thành lệnh riêng có banner | Constraints & Tradeoffs · Interaction/UX | FR-013, FR-016, FR-016a, US2 §5–6, SC-004, SC-004a, Assumption 5 |
| Q2 | Bảng "đủ lớn" là bao nhiêu dòng? | 100k seed mặc định + 1M sinh theo yêu cầu | Domain & Data Model (scale) | FR-011, FR-011a, FR-011b, SC-010a, Out of Scope |
| Q3 | Test cách ly dữ liệu ra sao? | Schema/database riêng mỗi lần chạy, drop khi xong; dữ liệu mẫu chỉ đọc | Edge Cases · Conflict resolution | FR-021, FR-021a–c, SC-007, SC-007a |
| Q4 | Engine nào chạy mỗi PR vs theo lịch? | Mỗi PR: PG/MySQL/SQLite/Redis/Mongo. Theo lịch: MSSQL/Oracle/MariaDB | Integration & External Deps · Observability | FR-025, FR-025a–c, SC-008a, Assumption 8 |
| Q5 | MariaDB dùng cổng nào? | 3307; bảng cổng đầy đủ chốt trong spec | Constraints (technical) · Terminology | FR-003 (bảng cổng), FR-003a, Assumption 2 |

**Tính từ chưa lượng hoá đã bị loại bỏ**: "đủ lớn" (→ 100k / 1M), "dấu hiệu nhìn thấy được" (→ dấu hiệu thường trực, 100% màn hình), "không gian tên riêng" (→ schema/database riêng có định danh ngẫu nhiên), "phân biệt tập engine" (→ liệt kê tên engine cụ thể), "cổng riêng" (→ 3307).

### Hạng mục còn Deferred sang `/speckit.plan`

| Hạng mục | Lý do hoãn |
|---|---|
| Observability (log/metric của môi trường) | Không đổi kiến trúc; quyết định ở tầng plan là đủ |
| Phiên bản cụ thể của từng image engine | Chi tiết thực thi; đã có Assumption 9 chốt "không nâng cấp phiên bản engine đang hỗ trợ" |
| Accessibility / localization của banner chế độ mock | Tác động thấp; theo chuẩn i18n đã có của `packages/ui` |
