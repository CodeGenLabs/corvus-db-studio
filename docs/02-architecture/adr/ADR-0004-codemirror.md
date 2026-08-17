# ADR-0004: CodeMirror 6 thay vì Monaco cho SQL Editor

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: SPEC-04

## Bối cảnh

SQL Editor cần: syntax highlight theo dialect, code completion nhận biết schema, code folding,
brace matching, find/replace có regex, word wrap, zoom, nhiều con trỏ, và **theming khớp
biến CSS của design system** (`--accent`, `--coral`, `--text3`…).

## Phương án đã cân nhắc

| Phương án | Kích thước (gzip) | Ưu | Nhược |
|---|---:|---|---|
| **Monaco** (lõi VS Code) | ~900 KB | Tính năng phong phú, quen thuộc | Rất nặng, một mình vượt ngân sách NFR-05. Theming qua JSON theme riêng, khó buộc vào biến CSS. Web worker bắt buộc, phức tạp khi đóng gói Electron. Ghi đè phím tắt phiền. |
| **CodeMirror 6** | ~180 KB | Kiến trúc module, chỉ nạp cái cần. Theming bằng CSS thuần → khớp token của ta trực tiếp. API completion/lint sạch. Hỗ trợ mobile. | Ít tính năng sẵn hơn; một số thứ phải tự viết |
| **Ace** | ~250 KB | Nhẹ, chín | API cũ, TS type kém, kiến trúc extension yếu |
| **Tự viết** | — | — | Không hợp lý |

## Quyết định

Dùng **CodeMirror 6**, bọc trong `packages/ui/src/editor/SqlEditor.tsx`.

Yếu tố quyết định: **theming**. Design system của Corvus dựa trên biến CSS đổi theo runtime
(light/dark + 5 font mono). CodeMirror nhận `EditorView.theme()` với giá trị `var(--accent)`
nên đổi theme là tức thì, không cần đăng ký theme lại. Monaco cần dịch bảng màu và vẫn không
hỗ trợ biến CSS ở mọi token.

Ngân sách bundle cũng quyết định: 900 KB của Monaco tiêu hết ngân sách NFR-05.

## Hệ quả

### Tích cực
- Bundle SPA nằm trong ngân sách.
- Editor đổi theme/font tức thì cùng phần còn lại của app.
- `@codemirror/lang-sql` có sẵn dialect cho PG/MySQL/MSSQL/SQLite → chỉ cần bổ sung từ khoá.
- Extension của ta (completion từ `introspect.identifiers`, highlight lỗi từ `CorvusError.position`)
  viết bằng API sạch.

### Tiêu cực / cái giá
- Phải tự viết: clipboard stack, thanh find/replace theo phong cách của ta, minimap (nếu cần).
- Ít ví dụ sẵn hơn Monaco → dev cần đọc tài liệu CodeMirror.

### Việc phải làm kèm theo
- `T-040` Bọc `SqlEditor` với theme buộc vào biến CSS.
- `T-041` Extension completion đọc `introspect.identifiers` (có cache + debounce).
- `T-042` Extension diagnostics hiển thị lỗi cú pháp tại `line/column`.
- `T-043` Bảng phím tắt: chạy (Ctrl+Enter), chạy vùng chọn, format, comment.
