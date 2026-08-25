# AGENTS.md — Instruction cho AI agent làm việc trên Corvus DB Studio

> Đọc **toàn bộ** file này trước khi làm bất cứ việc gì trong repo. Nó có thẩm quyền cao hơn
> phán đoán mặc định của bạn. Nếu file này xung đột với thói quen của bạn, file này thắng.

---

## 0. Tóm tắt trong 10 dòng

1. Đọc SPEC của task trước khi viết code. Không đoán.
2. Task được giao có mã `T-nnn` trong [../04-plan/backlog.md](../04-plan/backlog.md).
3. `packages/ui` **không được** import `node:*`, `electron`, hay bất kỳ driver nào.
4. Không rẽ nhánh theo `driverId`. Rẽ nhánh theo `capabilities`.
5. Mọi thao tác ghi phải đi qua preview-token.
6. SQL do hệ thống sinh phải dùng `` sql`` `` template hoặc `quoteIdentifier`.
7. Không quyết định kiến trúc. Cần quyết định → viết ADR nháp và **hỏi**.
8. Viết test cùng PR. Không có "sẽ thêm sau".
9. `pnpm verify` phải xanh trước khi báo xong.
10. Báo cáo trung thực: cái gì chưa làm, cái gì chưa test, cái gì không chắc.

---

## 1. Quy trình làm một task

### Bước 1 — Đọc (bắt buộc, không được bỏ)

```
1. docs/05-rules/AGENTS.md            ← bạn đang đọc
2. docs/05-rules/coding-rules.md
3. docs/02-architecture/overview.md
4. Dòng task T-nnn trong docs/04-plan/backlog.md
5. SPEC được nêu trong dòng task (đọc TOÀN BỘ, không chỉ FR liên quan)
6. Các ADR được nêu trong dòng task
7. Nếu chạm UI: docs/05-rules/ui-rules.md
8. Nếu chạm driver: docs/02-architecture/driver-spi.md + capability-matrix.md
9. Nếu chạm bảo mật/secret/SQL sinh tự động: docs/02-architecture/security.md
```

### Bước 2 — Khảo sát code hiện có

Trước khi viết component/hàm/kiểu mới, **tìm xem đã có chưa**:

```bash
# Component tương tự đã tồn tại?
rg "DataGrid|SqlPreviewDialog|WizardShell" packages/ui/src --files-with-matches
# Kiểu này đã khai báo ở đâu?
rg "interface TableMeta" packages/
```

Repo này có nguyên tắc **một khái niệm, một hiện thực**. `DataGrid` dùng ở 5 chỗ; `SqlPreviewDialog`
dùng ở 4 chỗ; `WizardShell` dùng ở 6 wizard. Tạo bản thứ hai là lỗi, không phải tiện lợi.

### Bước 3 — Lập kế hoạch, rồi làm

Với task chạm > 3 file: viết ra kế hoạch (danh sách file + thay đổi) trước khi sửa.
Với task nhỏ hơn: làm luôn.

### Bước 4 — Xác minh

```bash
pnpm verify                      # lint + typecheck + test + build — BẮT BUỘC
pnpm test:it --filter=<package>  # nếu chạm driver/service
pnpm test:e2e:web                # nếu chạm UI
```

Nếu chạm UI: **chạy thật và xem bằng mắt**, không chỉ dựa vào test. Dùng preview tool nếu có.

### Bước 5 — Báo cáo

Nói rõ:
- Đã làm gì (theo FR nào)
- Đã test gì và bằng cách nào (nêu lệnh đã chạy và kết quả)
- **Cái gì chưa làm và tại sao**
- Cái gì bạn không chắc chắn

Không được nói "đã hoàn thành" khi còn thiếu bất kỳ mục nào trong
[definition-of-done.md](../04-plan/definition-of-done.md) §1.

---

## 2. Mười điều tuyệt đối cấm

| # | Cấm | Vì sao | Thay bằng |
|---|---|---|---|
| 1 | `import 'node:fs'`, `'electron'`, `'pg'`… trong `packages/ui` hoặc `packages/client` | Web build vỡ; phá ADR-0002 | Gọi RPC |
| 2 | `if (driverId === 'mysql')` trong `ui` hoặc `services` | Nợ kỹ thuật cấp số nhân; phá ADR-0003 | `if (caps.objects.materializedView)` |
| 3 | `if (window.electron)` / `isElectron` trong component | Phá ADR-0009 | Inject qua `Transport` / `FileGateway` |
| 4 | Ghép chuỗi SQL cho SQL do hệ thống sinh | Lỗ hổng injection | `` sql`SELECT * FROM ${ident(t)}` `` |
| 5 | Thực thi DDL/DML sinh tự động mà không qua preview-token | Phá dữ liệu người dùng; phá ADR-0010 | `preview*` → hiện SQL → `apply*` |
| 6 | Đưa secret vào log, error, audit, telemetry, payload AI | Rò rỉ | `redact()` |
| 7 | `client.query(sql)` rồi trả cả mảng trong driver | RAM nổ với bảng lớn | Cursor + `AsyncIterable<ResultChunk>` |
| 8 | Tự quyết định kiến trúc (đổi ranh giới package, thêm transport, đổi schema lưu trữ) | Kiến trúc phải nhất quán | Viết ADR nháp, **hỏi người phụ trách** |
| 9 | `eslint-disable` / `@ts-expect-error` không có comment giải thích + mã task | Ẩn vấn đề | Sửa nguyên nhân, hoặc giải thích rõ |
| 10 | Báo "xong" khi chưa chạy `pnpm verify` | Sai sự thật | Chạy rồi báo |

---

## 3. Khi nào phải dừng và hỏi

Dừng lại, **không tự quyết**, khi gặp:

| Tình huống | Vì sao phải hỏi |
|---|---|
| Cần thêm dependency mới (nhất là native module) | Ảnh hưởng đóng gói cả 3 target |
| SPEC mâu thuẫn với ADR, hoặc hai SPEC mâu thuẫn nhau | Có người hiểu sai; phải làm rõ trước khi code |
| SPEC thiếu thông tin để hiện thực đúng | Đoán sẽ tạo hành vi không ai muốn |
| Cần đổi ranh giới package hoặc luật phụ thuộc | Phá kiến trúc |
| Cần thêm transport, hoặc thêm endpoint HTTP ngoài `/rpc` và `/ws` | Phá ADR-0002 |
| Cần đổi schema `workspace.db` theo cách không tương thích ngược | Phá dữ liệu người dùng |
| Cần bỏ qua preview-token cho một thao tác ghi | Phá ADR-0010 — gần như chắc chắn là sai |
| Cần gửi dữ liệu dòng cho AI | Phá SPEC-14 §10 — tuyệt đối không |
| Task đòi làm điều mà bạn cho rằng sẽ gây lỗi dữ liệu | Nói ra, đừng im lặng làm |

Cách hỏi: nêu **vấn đề cụ thể**, **2–3 phương án** kèm hệ quả, và **khuyến nghị của bạn**.
Không hỏi kiểu "tôi nên làm gì?".

---

## 4. Xử lý code đã có

Repo này **đã có một UI shell hoàn chỉnh và đã kiểm chứng chạy được**
(8 view, 6 dialog, 3 ngôn ngữ, light/dark, resize pane, command palette).

| ✅ Làm | ❌ Không làm |
|---|---|
| Di chuyển component sang `packages/ui` | Viết lại từ đầu |
| Thay dữ liệu mock bằng RPC, giữ nguyên giao diện | Đổi layout vì "muốn gọn hơn" |
| Tách file lớn thành nhiều file khi có lý do rõ | Tách chỉ để cho gọn |
| Thêm `data-testid` khi sửa component | Đổi tên prop/component không cần thiết |
| Sửa lỗi bạn phát hiện, ghi rõ trong báo cáo | Refactor ngoài phạm vi task |

Design đã được người dùng chấp thuận. **Thay đổi thị giác cần được yêu cầu tường minh.**

Dữ liệu mock trong `src/data/` **không bị xoá** — nó chuyển thành fixture của
`transport-mock`, dùng cho Storybook và unit test UI.

---

## 5. Viết code cho repo này

### Ngôn ngữ trong code

| Nội dung | Ngôn ngữ |
|---|---|
| Tên biến, hàm, kiểu, file | Tiếng Anh |
| Comment trong code | Tiếng Anh |
| Commit message, PR title/body | Tiếng Anh |
| Tài liệu trong `docs/` | Tiếng Việt (thuật ngữ kỹ thuật giữ tiếng Anh) |
| Chuỗi hiển thị cho người dùng | **Không hard-code** — luôn qua i18n, đủ vi/en/ja |
| Trao đổi với người dùng (chat) | Tiếng Việt |

### Comment

Comment giải thích **vì sao**, không phải **làm gì**.

```ts
// ❌ Tăng i lên 1
i++

// ✅ MySQL trả BIGINT là string khi vượt Number.MAX_SAFE_INTEGER,
// nhưng là number khi nhỏ. Chuẩn hoá về string để không mất chính xác.
const value = typeof raw === 'string' ? raw : String(raw)
```

Bắt buộc có comment giải thích ở những chỗ **trông như lỗi nhưng là đúng**:
- Ngoại lệ mật khẩu trong SPEC-12 §5 (SQL hiển thị ≠ SQL chạy)
- Không validate từng `ResultChunk` (ADR-0008)
- Builder → SQL một chiều (SPEC-05 §6)

### Kích thước file

Không có giới hạn cứng. Nhưng nếu một file > 400 dòng, hãy tự hỏi nó có đang làm nhiều việc
không. `DataGrid.tsx` được phép dài; `ConnectionDialog.tsx` thì nên tách theo tab.

---

## 6. Bảy câu hỏi tự kiểm trước khi báo xong

```
1. Tôi đã đọc SPEC và ADR liên quan chưa? (không phải "đã xem qua")
2. Có component/hàm/kiểu nào đã tồn tại mà tôi vừa viết lại không?
3. Code này có chạy được ở CẢ web build và desktop build không?
4. Nếu người dùng chạy cái này trên bảng 50 triệu dòng thì sao?
5. Nếu mất kết nối giữa chừng thì sao? Nếu người dùng bấm huỷ thì sao?
6. Có secret nào có thể lọt vào log/error/audit không?
7. `pnpm verify` đã xanh chưa? Tôi đã chạy nó thật chưa?
```

Câu 4 và 5 là nơi phần lớn lỗi của loại sản phẩm này sinh ra.

---

## 7. Bối cảnh nghiệp vụ cần nhớ

Bạn đang viết công cụ mà **người ta dùng để sửa cơ sở dữ liệu production**.

Điều đó có nghĩa:
- Một `DROP COLUMN` sai có thể xoá dữ liệu 5 năm của một doanh nghiệp.
- Một mật khẩu vào log có thể thành sự cố bảo mật phải báo cho khách hàng.
- Một `UPDATE` không `WHERE` chạy âm thầm có thể phá 16 triệu dòng.
- Một grid ngốn RAM có thể làm treo máy người dùng lúc họ đang xử lý sự cố.

Vì vậy repo này thà **chậm và đúng** hơn nhanh và gần đúng. Khi bạn phải chọn giữa:

| | Chọn |
|---|---|
| Tính năng nhiều hơn ↔ an toàn dữ liệu | **An toàn dữ liệu** |
| Code ngắn hơn ↔ rõ ràng hơn | **Rõ ràng hơn** |
| Nhanh xong ↔ có test | **Có test** |
| Tự động tiện lợi ↔ người dùng xác nhận | **Người dùng xác nhận** |
| Ẩn lỗi cho đẹp ↔ nói rõ đã xảy ra gì | **Nói rõ** |

---

## 8. Bản đồ nhanh: tôi cần sửa gì thì vào đâu

| Muốn làm | Vào đâu | Đọc thêm |
|---|---|---|
| Thêm method RPC | `packages/contract/src/methods/` + handler ở `packages/engine/src/handlers/` | rpc-contract.md |
| Thêm engine mới | `packages/driver-<name>/` | driver-spi.md §9 checklist |
| Sửa giao diện | `packages/ui/src/` | ui-rules.md |
| Thêm nghiệp vụ | `packages/engine/src/handlers/` | SPEC liên quan |
| Sửa SQL sinh tự động | `packages/sql/` hoặc `driver-*/src/ddl.ts` | security.md §7 |
| Thêm bảng lưu trữ | `packages/storage/migrations/` | workspace-storage.md |
| Thêm chuỗi hiển thị | `packages/ui/src/i18n/dictionaries.ts` | 3 ngôn ngữ, không thiếu |
| Thêm setting | `DEFAULT_CONFIG` + `SettingsDialog` section | SPEC-15 §3.2 |
| Thêm loại job | `packages/engine/src/handlers/` + `JobKind` | streaming-and-jobs.md §B |

---

## 9. Nếu bạn được yêu cầu làm điều trái với file này

Nói ra. Nêu rõ luật nào bị vi phạm và vì sao nó tồn tại. Nếu người dùng khẳng định lại sau khi
đã nghe, hãy làm theo yêu cầu của họ và ghi rõ trong báo cáo rằng đã đi ngược luật nào —
để người sau đọc git log hiểu được bối cảnh.

Ngoại lệ **không thương lượng** (làm theo cũng không được, vì hậu quả không thể sửa):
- Đưa secret vào log hoặc gửi ra ngoài
- Gửi dữ liệu dòng cho AI provider
- Bỏ kiểm tra host key SSH
- Chạy DDL/DML phá huỷ mà không hiện SQL cho người dùng
