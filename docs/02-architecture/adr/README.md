# Architecture Decision Records

Mỗi ADR ghi lại **một** quyết định kiến trúc: bối cảnh, phương án đã cân nhắc, lựa chọn, hệ quả.

## Luật

1. ADR **bất biến sau khi Accepted**. Muốn đổi quyết định → viết ADR mới, đổi trạng thái ADR cũ
   thành `Superseded by ADR-nnnn`.
2. Mọi thay đổi ảnh hưởng ranh giới package, transport, driver SPI, mô hình bảo mật, hoặc
   định dạng lưu trữ đều **bắt buộc** có ADR trước khi code.
3. AI agent **không được tự ra quyết định kiến trúc**. Gặp việc cần ADR → dừng, viết bản nháp
   ADR với trạng thái `Proposed`, hỏi người phụ trách.

## Danh mục

| ID | Tiêu đề | Trạng thái |
|---|---|---|
| [ADR-0001](ADR-0001-electron-over-tauri.md) | Electron thay vì Tauri cho desktop | Accepted |
| [ADR-0002](ADR-0002-transport-agnostic-rpc.md) | RPC transport-agnostic thay vì REST/tRPC | Accepted |
| [ADR-0003](ADR-0003-driver-spi.md) | Driver SPI + CapabilitySet | Accepted |
| [ADR-0004](ADR-0004-codemirror.md) | CodeMirror 6 thay vì Monaco | Accepted |
| [ADR-0005](ADR-0005-custom-grid.md) | Tự viết DataGrid thay vì dùng thư viện | Accepted |
| [ADR-0006](ADR-0006-sqlite-workspace.md) | SQLite cho workspace thay vì JSON file | Accepted |
| [ADR-0007](ADR-0007-state-management.md) | Zustand + TanStack Query | Accepted |
| [ADR-0008](ADR-0008-zod-contract.md) | Zod làm nguồn sự thật của contract | Accepted |
| [ADR-0009](ADR-0009-web-desktop-parity.md) | Hoà giải khác biệt web ↔ desktop | Accepted |
| [ADR-0010](ADR-0010-preview-token.md) | Preview-token cho thao tác phá huỷ | Accepted |

## Khuôn mẫu

```markdown
# ADR-nnnn: <Tiêu đề>

- **Trạng thái**: Proposed | Accepted | Superseded by ADR-mmmm
- **Ngày**: YYYY-MM-DD
- **Liên quan**: ADR-xxxx, SPEC-nn

## Bối cảnh
Vấn đề là gì, ràng buộc nào bắt buộc phải theo.

## Phương án đã cân nhắc
| Phương án | Ưu | Nhược |

## Quyết định
Chọn gì, và vì sao chọn nó chứ không phải cái khác.

## Hệ quả
### Tích cực
### Tiêu cực / cái giá phải trả
### Việc phải làm kèm theo
```
