# SPEC-04: SQL Editor & Query

- **Trạng thái**: Ready
- **Wave**: W-1 (lõi) / W-2 (completion, format, explain)
- **Tier**: T0
- **Phụ thuộc**: SPEC-02, SPEC-03, ADR-0004
- **Task**: T-040 … T-049, T-120 … T-134

---

## 1. Mục tiêu

Người dùng viết và chạy SQL tuỳ ý, xem nhiều tập kết quả, hiểu tại sao query chậm, và lưu lại
việc mình đã làm.

## 2. Phạm vi

**Trong phạm vi**: editor, chạy (toàn bộ / statement tại con trỏ / vùng chọn), nhiều result set,
tab Messages/Profile, huỷ, code completion, format/minify, find/replace, folding, query
parameters, explain, lưu query, query history, snippet.

**Ngoài phạm vi**: Query Builder trực quan → SPEC-05. Editor MongoDB/Redis → SPEC-13.

## 3. Yêu cầu chức năng

### 3.1 Editor

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-04.01 | Editor MUST dùng CodeMirror 6, theme buộc vào biến CSS của design system | MUST |
| FR-04.02 | Syntax highlight MUST theo dialect của connection đang chọn | MUST |
| FR-04.03 | Số dòng MUST theo setting `showLineNos`; cỡ chữ theo `fontSize`; font theo `mono` | MUST |
| FR-04.04 | Code folding, brace matching, word wrap, zoom (`Ctrl+=`/`Ctrl+-`/`Ctrl+0`) | SHOULD |
| FR-04.05 | Find/Replace MUST hỗ trợ match case, whole word, regex, highlight all | SHOULD |
| FR-04.06 | Nhiều con trỏ (`Ctrl+Click`, `Alt+Shift+↓`) | MAY |
| FR-04.07 | Editor MUST giữ nội dung khi đổi tab và khi app khởi động lại (draft tự lưu) | MUST |

### 3.2 Chạy query

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-04.08 | `Ctrl+Enter` MUST chạy statement tại con trỏ; `Ctrl+Shift+Enter` chạy toàn bộ script | MUST |
| FR-04.09 | Có vùng chọn thì MUST chỉ chạy vùng chọn | MUST |
| FR-04.10 | Tách statement MUST đúng: bỏ qua `;` trong chuỗi, comment, dollar-quote (PG), `DELIMITER` (MySQL) | MUST |
| FR-04.11 | Nhiều result set MUST hiện thành nhiều tab `Result 1..N` | MUST |
| FR-04.12 | Result grid MUST dùng lại `DataGrid` ở chế độ read-only | MUST |
| FR-04.13 | Tab Messages MUST hiện notice/warning của server và số dòng bị ảnh hưởng cho từng statement | MUST |
| FR-04.14 | `Esc` hoặc nút Stop MUST huỷ query đang chạy trong ≤ 200 ms | MUST |
| FR-04.15 | Thanh trạng thái MUST hiện: thời gian chạy, số dòng, tên connection/database | MUST |
| FR-04.16 | Kết quả vượt `maxRows` (mặc định 500 000) MUST bị cắt kèm banner rõ ràng | MUST |
| FR-04.17 | Khi script chạy nhiều statement, lỗi ở statement thứ k MUST dừng lại và nêu rõ statement nào (tuỳ chọn "tiếp tục khi lỗi") | MUST |
| FR-04.18 | SQL chứa DML/DDL trên connection read-only MUST bị từ chối **trước khi** gửi tới server, kèm giải thích | MUST |
| FR-04.19 | `DELETE`/`UPDATE` không có `WHERE` MUST hiện cảnh báo xác nhận trước khi chạy | MUST |

### 3.3 Trợ giúp soạn thảo

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-04.20 | Code completion MUST gợi ý: từ khoá, tên bảng/view, tên cột sau `.`, tên hàm, snippet | SHOULD |
| FR-04.21 | Completion MUST nhận biết ngữ cảnh: sau `FROM` gợi ý bảng, sau `SELECT` gợi ý cột của bảng trong `FROM` | SHOULD |
| FR-04.22 | Nguồn completion MUST là `introspect.identifiers`, cache và cập nhật nền | SHOULD |
| FR-04.23 | Format SQL MUST theo tuỳ chọn (uppercase keyword, độ rộng dòng, chiều thụt lề) | SHOULD |
| FR-04.24 | Minify SQL | MAY |
| FR-04.25 | Convert case, indent/outdent, comment/uncomment vùng chọn | SHOULD |
| FR-04.26 | Lỗi cú pháp MUST được highlight tại `line:column` từ `CorvusError.position` | SHOULD |

### 3.4 Query parameters

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-04.27 | SQL chứa `:name` hoặc `$name` MUST được nhận là tham số; khi chạy thì hỏi giá trị | SHOULD |
| FR-04.28 | Giá trị tham số MUST được bind, KHÔNG nội suy chuỗi | MUST |
| FR-04.29 | Bộ giá trị tham số MAY lưu cùng query | MAY |

### 3.5 Explain

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-04.30 | `Explain` MUST hiện plan; `Explain Analyze` khi `caps.exec.explainAnalyze` | SHOULD |
| FR-04.31 | Plan MUST hiện dạng cây có thể mở/gập, kèm cost và số dòng ước lượng/thực tế | SHOULD |
| FR-04.32 | Node đắt nhất MUST được tô nổi bật (theo % tổng cost) | SHOULD |
| FR-04.33 | Có nút chuyển sang xem plan thô (text/JSON) | SHOULD |

### 3.6 Lưu & lịch sử

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-04.34 | Người dùng MUST lưu query vào workspace (có tên, gắn connection/database) | MUST |
| FR-04.35 | Người dùng MUST mở file `.sql` từ ngoài và lưu ra file ngoài (qua `FileGateway`) | MUST |
| FR-04.36 | Mọi lần chạy MUST được ghi vào query history: SQL, thời điểm, thời lượng, số dòng, kết quả | MUST |
| FR-04.37 | History MUST tìm kiếm được theo nội dung SQL và lọc theo connection/khoảng thời gian | MUST |
| FR-04.38 | Snippet: built-in + tự tạo, chèn bằng completion, hỗ trợ placeholder `${1:name}` | SHOULD |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `SqlView` | `packages/ui/src/views/SqlView.tsx` | **đã có** — thay block tĩnh bằng editor thật |
| `SqlEditor` | `packages/ui/src/editor/SqlEditor.tsx` | mới (CodeMirror wrapper) |
| `sqlCompletion` | `…/editor/extensions/completion.ts` | mới |
| `sqlDiagnostics` | `…/editor/extensions/diagnostics.ts` | mới |
| `corvusTheme` | `…/editor/theme.ts` | mới — map token → biến CSS |
| `ResultTabs` | `…/views/sql/ResultTabs.tsx` | mới |
| `MessagesPanel` | `…/views/sql/MessagesPanel.tsx` | mới |
| `ExplainTree` | `…/views/sql/ExplainTree.tsx` | mới |
| `ParamPrompt` | `…/dialogs/ParamPrompt.tsx` | mới |
| `QueryHistoryPanel` | `…/panes/QueryHistoryPanel.tsx` | mới |

Trạng thái: empty (editor trống → hiện gợi ý phím tắt) · loading (đang chạy → thanh tiến trình
mảnh + nút Stop) · ready · error (panel lỗi dưới editor, highlight dòng lỗi) · unsupported
(nút Explain Analyze mờ kèm tooltip).

### Phím tắt

| Phím | Hành động |
|---|---|
| `Ctrl+Enter` | Chạy statement tại con trỏ / vùng chọn |
| `Ctrl+Shift+Enter` | Chạy toàn bộ script |
| `Esc` | Huỷ query đang chạy |
| `Ctrl+E` | Explain |
| `Ctrl+Shift+F` | Format SQL |
| `Ctrl+/` | Comment / uncomment |
| `Ctrl+F` / `Ctrl+H` | Find / Replace |
| `Ctrl+S` | Lưu query |
| `Ctrl+Space` | Gọi completion |
| `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Zoom |

## 5. Hợp đồng RPC

Xem `query.execute` và `query.explain` trong
[rpc-contract.md](../02-architecture/rpc-contract.md) §3. Bổ sung:

```ts
export const querySplit = defineUnary({
  name: 'query.split',
  params: z.object({ driverId: DriverId, sql: z.string() }),
  result: z.array(z.object({
    sql: z.string(),
    start: z.number(), end: z.number(),        // offset trong văn bản gốc
    kind: z.enum(['select', 'dml', 'ddl', 'other']),
    hasWhere: z.boolean(),                      // cho FR-04.19
  })),
  permission: 'query:execute',
  audit: 'none',
})

export const queryFormat = defineUnary({
  name: 'query.format',
  params: z.object({
    driverId: DriverId, sql: z.string(),
    options: z.object({
      uppercaseKeywords: z.boolean().default(true),
      indentWidth: z.number().int().min(1).max(8).default(2),
      maxLineWidth: z.number().int().default(100),
    }),
  }),
  result: z.object({ sql: z.string() }),
  permission: 'query:execute',
  audit: 'none',
})
```

## 6. Logic engine

### Tách statement — không dùng regex

`@corvus/sql/parse/splitStatements.ts` là **tokenizer viết tay** cho từng dialect. Phải xử lý:

| Trường hợp | Ví dụ |
|---|---|
| Chuỗi nháy đơn có escape | `'it''s'`, `'a\\'b'` (MySQL) |
| Định danh nháy | `"a;b"`, `` `a;b` ``, `[a;b]` |
| Comment dòng và block | `-- ;`, `/* ; */`, block lồng nhau (PG) |
| Dollar-quote (PG) | `$$ … ; … $$`, `$tag$ … $tag$` |
| `DELIMITER` (MySQL) | `DELIMITER $$ … $$ DELIMITER ;` |
| Body routine | `BEGIN … ; … END` |
| `GO` (MSSQL) | Phân cách batch, không phải `;` |
| `/` (Oracle) | Kết thúc block PL/SQL |

Có bộ test bảng vàng ≥ 60 case cho mỗi dialect. **Đây là chỗ dễ sai nhất** — chạy sai một
statement bị cắt giữa có thể phá dữ liệu.

### Kiểm tra read-only và cảnh báo

```
1. query.split → phân loại từng statement
2. Nếu connection read-only và có statement kind ∈ {dml, ddl} → từ chối, nêu statement nào
3. Nếu có dml && !hasWhere → trả về cảnh báo, UI hỏi xác nhận, chạy lại với confirmed=true
4. Chạy từng statement theo thứ tự; lỗi thì dừng (hoặc tiếp nếu continueOnError)
```

### Query history

Ghi **sau khi** chạy xong (kể cả lỗi), bất đồng bộ, không chặn. SQL được redact nếu bật tuỳ
chọn "không lưu SQL chứa dữ liệu".

## 7. Khác biệt theo engine

| Engine | Khác biệt | Xử lý |
|---|---|---|
| MySQL | `multipleStatements` mặc định tắt | Bật **chỉ** cho session SQL Editor, không cho `data.*` |
| PostgreSQL | Dollar-quote; NOTICE cần thu | Tokenizer riêng; NOTICE vào tab Messages |
| Oracle | Không nhiều statement/lần gửi | Engine gửi lần lượt; `/` là dấu kết thúc block |
| MSSQL | `GO` phân cách batch | Tách theo `GO` ở đầu dòng |
| SQLite | Không nhiều result set | Chỉ 1 tab Result |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Cú pháp sai | `SQL_SYNTAX` | Highlight `line:column`, thông điệp gốc ở panel lỗi |
| Không có quyền | `PERMISSION_DENIED` | Nêu rõ object bị từ chối |
| Timeout | `QUERY_TIMEOUT` | "Query bị huỷ sau {n}s" + gợi ý tăng timeout |
| Người dùng huỷ | `CANCELLED` | "Đã huỷ" (không phải lỗi đỏ) |
| Read-only chặn | `READ_ONLY_CONNECTION` | "Kết nối ở chế độ chỉ đọc. Statement #{k} là {kind}." |
| Kết quả bị cắt | — | Banner: "Đã hiện 500 000 / ~3 200 000 dòng" + nút Export toàn bộ |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Nhập liệu trong file 5 000 dòng SQL | ≤ 16 ms/keystroke |
| `query.split` với script 10 000 dòng | ≤ 100 ms |
| Completion popup xuất hiện | ≤ 80 ms |
| First row của result | ≤ 150 ms sau khi server trả |
| Format SQL 5 000 dòng | ≤ 500 ms |

## 10. Bảo mật

- `query:execute`. Read-only → chỉ `query:execute:readonly`.
- Audit `full` cho `query.execute` ở web; SQL được redact theo cấu hình.
- Query parameter **luôn** bind, không nội suy (FR-04.28).
- `multipleStatements` chỉ bật cho session editor — giảm thiệt hại nếu có injection ở nơi khác.

## 11. i18n

`sql.run`, `sql.runAll`, `sql.stop`, `sql.explain`, `sql.explainAnalyze`, `sql.format`,
`sql.minify`, `sql.save`, `sql.openFile`, `sql.result`, `sql.messages`, `sql.profile`,
`sql.truncated`, `sql.noWhereWarning`, `sql.readOnlyBlocked`, `sql.statementFailed`,
`sql.continueOnError`, `sql.params.title`, `history.*` (7), `snippet.*` (5), `explain.*` (9)

## 12. Tiêu chí chấp nhận

```
[ ] FR-04.01–38 đều có test
[ ] splitStatements: ≥ 60 golden case / dialect, đủ 8 trường hợp khó ở §6
[ ] Chạy statement tại con trỏ chọn đúng statement (test theo offset)
[ ] Huỷ query ≤ 200 ms + server nhận CANCEL (integration)
[ ] Nhiều result set hiện đủ tab (PG, MySQL, MSSQL)
[ ] Read-only chặn DML/DDL trước khi gửi
[ ] Cảnh báo DELETE/UPDATE không WHERE (e2e)
[ ] Completion gợi ý đúng cột sau khi gõ alias + `.`
[ ] Lỗi cú pháp highlight đúng dòng/cột
[ ] Explain hiện cây, tô node đắt nhất
[ ] History ghi và tìm được
[ ] Editor giữ draft sau khi restart app
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
