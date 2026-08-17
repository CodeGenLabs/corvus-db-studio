# Definition of Done

Ba mức: **Task** → **Feature** → **Wave**. Không được nhảy mức.

---

## 1. Task DoD

Một task `T-nnn` chỉ được đóng khi **tất cả** đúng:

```
CODE
[ ] Code hiện thực đúng các FR được liệt kê trong dòng task
[ ] Không có TODO/FIXME mới mà không có mã task kèm theo
[ ] Không có console.log / print debug còn lại
[ ] Không có code chết (unused export, hàm không ai gọi)
[ ] Tuân thủ toàn bộ coding-rules.md (không có eslint-disable mới không giải thích)

TEST
[ ] Có test cho luồng chính
[ ] Có test cho ít nhất một luồng lỗi
[ ] Test mới xanh; test cũ không bị hỏng
[ ] Ngưỡng phủ của package không giảm

XÁC MINH
[ ] pnpm verify xanh (lint + typecheck + test + build)
[ ] Nếu chạm UI: đã chạy thật trên web build VÀ desktop build, không chỉ dev server
[ ] Nếu chạm driver/service: integration test xanh trên ít nhất 2 engine
[ ] Nếu chạm hiệu năng: đo lại benchmark liên quan, không tụt > 15%

TÀI LIỆU
[ ] SPEC được cập nhật nếu hành vi khác với mô tả ban đầu
[ ] Khoá i18n mới có đủ vi/en/ja
[ ] Nếu thêm/đổi method RPC: contract có schema + permission + audit
[ ] Nếu là quyết định kiến trúc: đã có ADR được duyệt TRƯỚC khi code
```

**Không tính là xong nếu**: "chạy được trên máy tôi", "test sẽ thêm sau", "còn thiếu tiếng Nhật",
"chỉ thiếu xử lý lỗi".

---

## 2. Feature DoD

Một mục trong [feature-inventory.md](../01-scope/feature-inventory.md) được đánh ✅ khi:

```
[ ] Mọi task của feature đó đã đóng theo Task DoD
[ ] Toàn bộ FR MUST của SPEC đã hiện thực (FR SHOULD/MAY có thể để sau, ghi rõ)
[ ] Hoạt động với ≥ 2 engine (trừ feature đặc thù một engine)
[ ] Có E2E test trên cả web và desktop
[ ] Đủ 5 trạng thái UI: empty · loading · ready · error · unsupported
[ ] Xử lý được: dữ liệu rỗng · dữ liệu rất lớn (≥ 1M dòng) · mất kết nối giữa chừng · huỷ giữa chừng
[ ] i18n đủ 3 ngôn ngữ, kiểm cả layout tiếng Nhật không vỡ
[ ] Nếu là thao tác ghi: đi qua preview-token, chặn ở read-only
[ ] Có mục trong tài liệu người dùng
[ ] Không có lỗi P0/P1 mở liên quan
```

Chưa đủ → trạng thái là 🟡 **partial**, và **không được tính vào tiêu chí ra wave**.

---

## 3. Wave DoD

```
[ ] Toàn bộ tiêu chí ra wave trong roadmap.md của wave đó đạt
[ ] Mọi feature dự kiến trong wave ở trạng thái ✅ (không phải 🟡)
[ ] Feature bị cắt khỏi wave đã được ghi lại kèm lý do và wave mới
[ ] Nợ kỹ thuật phát sinh trong wave đã trả (15% thời lượng dành cho việc này)
[ ] NFR liên quan được đo lại và ghi vào bảng theo dõi
[ ] Integration test nightly xanh 3 lần liên tiếp
[ ] Không có test flaky nào chưa xử lý
[ ] pnpm audit + trivy không có high/critical
[ ] Đã làm manual/exploratory checklist (testing-strategy.md §6)
[ ] Đã cập nhật: CHANGELOG, feature-inventory (trạng thái), estimation (pw thực tế)
[ ] Retro của wave đã họp và ghi kết luận
```

Thêm cho wave có phát hành (`W-3`, `W-5`, và mọi wave sau):

```
[ ] Toàn bộ checklist phát hành trong packaging-release.md §7
[ ] Nâng cấp từ phiên bản trước thử nghiệm với workspace thật
[ ] Cài thử trên Windows sạch
[ ] Kiểm thử bảo mật: 10 test rò rỉ xanh
```

---

## 4. Định nghĩa mức độ lỗi

| Mức | Định nghĩa | Thời hạn xử lý |
|---|---|---|
| **P0** | Mất dữ liệu, phá dữ liệu, rò rỉ secret, app không khởi động được | Ngay lập tức, dừng mọi việc khác |
| **P1** | Tính năng chính không dùng được, không có cách vòng | ≤ 2 ngày làm việc |
| **P2** | Tính năng lỗi nhưng có cách vòng | Trong wave hiện tại |
| **P3** | Lỗi hiển thị, khó chịu nhỏ | Backlog |

**Không wave nào được đóng khi còn P0 hoặc P1 mở.**

Ví dụ P0 trong bối cảnh này:
- `alterTable` sinh `DROP COLUMN` khi người dùng chỉ đổi tên cột
- Import ghi giá trị sai kiểu vào bảng mà không báo lỗi
- Mật khẩu DB xuất hiện trong log
- Read-only không chặn được một đường ghi nào đó
- Restore chạy mà không hiện danh sách bảng sẽ bị DROP

---

## 5. Điều KHÔNG được coi là lý do bỏ qua DoD

| Lý do thường gặp | Trả lời |
|---|---|
| "Deadline gấp" | Cắt scope, không cắt chất lượng. Ít tính năng chạy đúng > nhiều tính năng chạy sai. |
| "Đây chỉ là code tạm" | Code tạm sống lâu nhất. Nếu thật sự tạm, phải có mã task xoá nó. |
| "Test sẽ thêm ở PR sau" | PR sau không bao giờ tới. Test cùng PR. |
| "Chỉ ảnh hưởng edge case" | Edge case của DB là dữ liệu thật của ai đó. |
| "Người dùng sẽ không làm thế" | Người dùng sẽ làm thế. |
| "Engine kia dùng ít, để sau" | Được — nhưng phải ghi vào feature-inventory là 🟡, không phải ✅. |
