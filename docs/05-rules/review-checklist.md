# Review Checklist

Người review chịu trách nhiệm ngang tác giả. Approve nghĩa là "tôi đã kiểm và tôi đồng chịu
trách nhiệm", không phải "tôi đã cuộn qua".

---

## 0. Trước khi đọc diff

```
[ ] PR có mã T-nnn và nêu đúng SPEC/FR
[ ] Tôi đã đọc dòng task trong backlog và các FR được nêu
[ ] Mục "Đã kiểm chứng thế nào" có lệnh cụ thể và kết quả, không phải "đã test"
[ ] Diff ≤ 400 dòng (trừ test/golden/lock). Lớn hơn → yêu cầu tách
[ ] CI xanh
```

Nếu tác giả viết "đã test" mà không nêu cách → `question:` yêu cầu chi tiết. Đây là dấu hiệu
phổ biến nhất của việc chưa test thật.

---

## 1. Kiến trúc & ranh giới

```
[ ] Không có import vi phạm luật tầng (ui/client/contract không chạm node/electron/driver)
[ ] Không có `if (driverId === '…')` trong ui hoặc services
[ ] Không có `if (isElectron)` / `window.electron` trong component
[ ] Method RPC mới có schema + `permission` + `audit` trong contract
[ ] Không có endpoint HTTP mới ngoài /rpc và /ws
[ ] Nếu là quyết định kiến trúc: ADR có tồn tại và được duyệt TRƯỚC khi code
[ ] Không nhân bản component/hàm đã có (DataGrid, SqlPreviewDialog, WizardShell, SqlEditor…)
```

---

## 2. An toàn dữ liệu — kiểm kỹ nhất

```
[ ] Thao tác ghi đi qua preview* → apply*, apply chỉ nhận previewToken
[ ] SQL hiển thị = SQL chạy (ngoại lệ mật khẩu phải có comment giải thích)
[ ] Read-only bị chặn ở ENGINE, không chỉ ẩn nút ở UI
[ ] UPDATE/DELETE định danh dòng bằng khoá chính, không bằng ROWID hay LIMIT 1
[ ] Bảng không có PK: không sinh UPDATE/DELETE
[ ] Cảnh báo mất dữ liệu / rebuild bảng / khoá bảng xuất hiện đúng lúc
[ ] Thao tác không hoàn tác được có xác nhận tương xứng (gõ tên object)
[ ] Nếu engine không transactional: có cảnh báo "không thể hoàn tác tự động"
```

**Câu hỏi phải tự trả lời**: nếu code này chạy trên production của một doanh nghiệp và có gì
sai, cái gì mất? Có cách nào lấy lại không?

---

## 3. Bí mật & SQL injection

```
[ ] Secret không đi qua RPC result
[ ] Không có secret trong log / error / audit / telemetry / payload AI
[ ] SQL sinh tự động dùng sql`` template hoặc quoteIdentifier — KHÔNG ghép chuỗi
[ ] Giá trị bind qua parameter, không nội suy
[ ] Tên object có ký tự đặc biệt vẫn quote đúng (nghĩ tới `users"; DROP TABLE x; --`)
[ ] `{ t: 'raw' }` chỉ từ input người dùng tường minh, có cảnh báo
[ ] Không thêm domain ngoài vào CSP
[ ] Không phơi thêm API ra window trong preload
```

---

## 4. Hiệu năng & tài nguyên

```
[ ] Không nạp toàn bộ result set vào RAM ở bất kỳ tầng nào
[ ] Driver dùng cursor, không client.query() trả cả mảng
[ ] Introspection dùng truy vấn gộp, không N+1
[ ] Danh sách > 200 phần tử đã ảo hoá
[ ] Thao tác > 50 ms trong UI chuyển sang Web Worker
[ ] Không tạo object/hàm mới trong render path nóng (grid cell)
[ ] Benchmark liên quan không tụt > 15%
[ ] Không thêm dependency lớn vào bundle ui mà không tính kích thước
```

**Câu hỏi phải tự trả lời**: nếu bảng có 50 triệu dòng thay vì 100 thì code này thế nào?

---

## 5. Xử lý lỗi & huỷ

```
[ ] Handler ném CorvusError, không Error thô
[ ] Mã lỗi mới có khoá i18n error.*
[ ] Không catch rỗng; nếu cố ý bỏ qua thì có comment lý do
[ ] AbortSignal được nhận VÀ được tôn trọng
[ ] Huỷ dọn dẹp đủ: cursor đóng, tx rollback, file tạm xoá, kết nối trả pool
[ ] Mất kết nối giữa chừng được xử lý; KHÔNG tự chạy lại thao tác ghi
[ ] Lỗi có vị trí (line/column) được giữ để UI highlight
[ ] Thông điệp lỗi cho người dùng qua i18n, không phải chuỗi thô từ driver
```

**Câu hỏi phải tự trả lời**: nếu mạng đứt đúng lúc này thì sao? Nếu người dùng bấm huỷ đúng
lúc này thì sao?

---

## 6. UI (nếu PR chạm UI)

```
[ ] Không có mã màu hard-code — dùng biến CSS
[ ] Không có cỡ chữ mới ngoài bảng ui-rules.md §2
[ ] Hover dùng class có sẵn, không onMouseEnter thủ công
[ ] Đủ 5 trạng thái: empty / loading / ready / error / unsupported
[ ] Loading là skeleton giữ hình dạng, không spinner toàn màn hình
[ ] Mọi chuỗi qua t(), đủ vi/en/ja
[ ] Tác giả đã xem layout tiếng Nhật (chữ rộng gấp đôi)
[ ] Đã xem dark mode
[ ] Điều hướng bàn phím được; focus thấy được
[ ] Icon-only button có title + aria-label
[ ] Thông tin không truyền tải CHỈ bằng màu
[ ] Có data-testid cho phần tử tương tác
[ ] Server state trong react-query, shell state trong zustand — không trộn
[ ] Tác giả đã chạy trên CẢ web build và desktop build
```

---

## 7. Test

```
[ ] Có test luồng chính VÀ luồng lỗi
[ ] Tên test mô tả hành vi, không phải 'test 1'
[ ] Không test.skip không có comment + mã task
[ ] Không sleep()
[ ] Test độc lập, tự dọn dữ liệu
[ ] Nếu chạm driver/service: có integration test trên ≥ 2 engine
[ ] Nếu chạm SQL sinh tự động: golden file được cập nhật VÀ thay đổi được giải thích
[ ] Nếu chạm UI: có E2E cho luồng chính
[ ] Ngưỡng phủ không giảm
[ ] Test có thật kiểm điều nó nói không? (đọc assertion, đừng chỉ đếm số test)
```

Cạm bẫy hay gặp: test gọi hàm rồi chỉ assert "không throw". Đó không phải test.

---

## 8. Code

```
[ ] Không `any`; `as` có comment giải thích
[ ] Không TODO/FIXME mới không có mã task
[ ] Không console.log còn lại
[ ] Không code chết (export không ai dùng, hàm không ai gọi)
[ ] Comment giải thích VÌ SAO, không phải LÀM GÌ
[ ] Chỗ "trông như lỗi nhưng là đúng" có comment
[ ] Đặt tên theo coding-rules.md §11
[ ] eslint-disable / @ts-expect-error mới có giải thích + mã task
```

---

## 9. Câu hỏi cuối — dành cho reviewer

Trước khi approve, tự trả lời bằng lời:

```
1. Tôi hiểu code này làm gì và vì sao làm thế không?
   (Nếu không → question:, đừng approve cho xong)

2. Nếu code này gây sự cố mất dữ liệu, tôi có giải thích được nguyên nhân
   cho khách hàng không?

3. Có đường nào tôi thấy được mà code này xử lý sai không?
   (bảng lớn · mất kết nối · huỷ giữa chừng · dữ liệu rỗng · tên object lạ ·
    read-only · engine khác · quyền thiếu)

4. Tôi có tin số liệu trong mục "Đã kiểm chứng" không?
   (Nếu không → question: yêu cầu chạy lại và dán output)

5. Sáu tháng sau, người mới đọc code này có hiểu được không?
```

---

## 10. Khi nào từ chối PR (request changes)

Từ chối, không phải "approve có góp ý", khi:

- Thao tác ghi không qua preview-token
- SQL sinh tự động ghép chuỗi
- Secret có đường vào log/error/audit
- Không có test cho code mới
- Vi phạm luật tầng
- Đánh giá là "xong" nhưng thiếu mục trong Task DoD
- Quyết định kiến trúc mà không có ADR
- Không nạp result set theo cursor trong driver
- `test.skip` im lặng hoặc tăng timeout để test qua
- Mục "Đã kiểm chứng" không có nội dung thật

Từ chối PR không phải xúc phạm cá nhân. Merge code sai vào công cụ sửa database production
thì mới là vấn đề.
