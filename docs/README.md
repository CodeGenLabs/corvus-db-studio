# Corvus DB Studio — Hồ sơ thiết kế & kế hoạch triển khai

Đây là **nguồn sự thật duy nhất** (single source of truth) cho việc phát triển Corvus DB Studio
từ một UI shell tĩnh thành một công cụ quản trị cơ sở dữ liệu đa nền tảng chạy thật, phát hành
được đồng thời dưới dạng **web app** và **Windows desktop app**.

Tài liệu được viết để **cả người và AI agent đều đọc và thực thi được**. Mọi agent nhận việc
trong repo này phải đọc theo đúng thứ tự ở mục [Thứ tự đọc bắt buộc](#thứ-tự-đọc-bắt-buộc).

---

## Bối cảnh

| Hạng mục | Trạng thái hiện tại |
|---|---|
| UI shell | ✅ Đã có — React 18 + TS + Vite, 8 view, 6 dialog, 3 ngôn ngữ, light/dark (xem [../README.md](../README.md)) |
| Dữ liệu | ❌ Toàn bộ là mock tĩnh trong `src/data/` |
| Kết nối DB thật | ❌ Chưa có |
| Đóng gói desktop | ❌ Chưa có |

Tham chiếu tính năng: **Navicat User Guide** (`navicat_en.pdf`, 384 trang, 22 chương).
Corvus **không sao chép code hay tài sản** của Navicat; tài liệu đó chỉ dùng làm *feature
inventory* và *chuẩn hành vi nghiệp vụ* cho một công cụ cùng phân khúc.

---

## Thứ tự đọc bắt buộc

Agent nào cũng phải đọc 4 tài liệu này trước khi viết dòng code đầu tiên:

1. **[05-rules/AGENTS.md](05-rules/AGENTS.md)** — luật làm việc, quy trình, điều cấm.
2. **[05-rules/coding-rules.md](05-rules/coding-rules.md)** — quy tắc code bắt buộc.
3. **[02-architecture/overview.md](02-architecture/overview.md)** — kiến trúc tổng thể.
4. **[04-plan/backlog.md](04-plan/backlog.md)** — tìm task được giao (mã `T-xxx`).

Sau đó đọc SPEC tương ứng với task trong [03-specs/](03-specs/).

---

## Bản đồ tài liệu

> **Giao việc cho một AI mới?** Dùng prompt sẵn có trong
> [KICKOFF-PROMPT.md](KICKOFF-PROMPT.md) — 3 biến thể cho 3 tình huống.

```
docs/
├── README.md                        ← bạn đang ở đây
├── KICKOFF-PROMPT.md                Prompt dán cho AI mới (3 biến thể)
│
├── 01-scope/
│   ├── feature-inventory.md         Toàn bộ tính năng Navicat → module Corvus → tier → wave
│   └── scope-decisions.md           Cái gì làm, cái gì không, và vì sao
│
├── 02-architecture/
│   ├── overview.md                  ★ Kiến trúc tổng thể: một codebase → web + desktop
│   ├── monorepo.md                  Cấu trúc package, ranh giới phụ thuộc
│   ├── rpc-contract.md              ★ Hợp đồng RPC transport-agnostic
│   ├── driver-spi.md                ★ Giao diện driver, cách thêm engine mới
│   ├── capability-matrix.md         Ma trận năng lực engine × tính năng
│   ├── security.md                  Mô hình bảo mật, vault, tunnel, RBAC, audit
│   ├── workspace-storage.md         Lưu trữ workspace, schema `workspace.db`
│   ├── streaming-and-jobs.md        Streaming result set + job dài hạn + scheduler
│   ├── packaging-release.md         Đóng gói web (Docker) + desktop (Electron), CI/CD
│   └── adr/                         Architecture Decision Records (ADR-0001…0010)
│
├── 03-specs/
│   ├── _TEMPLATE.md                 Khuôn mẫu bắt buộc cho mọi SPEC mới
│   └── SPEC-01 … SPEC-15            Đặc tả chức năng — xem bảng bên dưới
│
├── 04-plan/
│   ├── roadmap.md                   ★ 10 wave, mốc phát hành, tiêu chí ra wave
│   ├── backlog.md                   ★ Epic → Story → Task có mã, phụ thuộc, DoD
│   ├── driver-roadmap.md            ★ Kế hoạch kết nối đủ 7 engine database
│   ├── audit-2026-08-18.md          Rà soát 230 dấu [DONE] sai sự thật — đọc trước backlog
│   ├── estimation.md                Ước lượng công sức & nhân lực
│   ├── testing-strategy.md          Chiến lược kiểm thử 5 tầng
│   └── definition-of-done.md        DoD chuẩn cho mọi task
│
└── 05-rules/
    ├── AGENTS.md                    ★ Instruction cho AI agent
    ├── coding-rules.md              ★ Quy tắc code (TS, React, Node, SQL)
    ├── ui-rules.md                  Quy tắc UI/design system
    ├── git-and-pr-rules.md          Branch, commit, PR
    └── review-checklist.md          Checklist review bắt buộc
```

★ = tài liệu cốt lõi, đọc kỹ.

### Bảng SPEC

| SPEC | Module | Tier | Wave |
|---|---|:-:|:-:|
| [SPEC-01](03-specs/SPEC-01-connection.md) | Quản lý kết nối | T0 | W-0 |
| [SPEC-02](03-specs/SPEC-02-navigation-objects.md) | Điều hướng & danh sách đối tượng | T0 | W-0 |
| [SPEC-03](03-specs/SPEC-03-data-editor.md) | **Data Editor** (module khó nhất) | T0 | W-1 |
| [SPEC-04](03-specs/SPEC-04-sql-editor.md) | SQL Editor & Query | T0 | W-1 |
| [SPEC-05](03-specs/SPEC-05-query-builder.md) | Query Builder trực quan | T2 | W-4 |
| [SPEC-06](03-specs/SPEC-06-object-designer.md) | Object Designer (Table/View/Routine) | T0 | W-2 |
| [SPEC-07](03-specs/SPEC-07-er-and-model.md) | ER Diagram & Model Designer | T1/T2 | W-4/W-6 |
| [SPEC-08](03-specs/SPEC-08-import-export.md) | Import & Export | T1 | W-3 |
| [SPEC-09](03-specs/SPEC-09-transfer-sync.md) | Transfer / Data Sync / Structure Sync | T2 | W-6 |
| [SPEC-10](03-specs/SPEC-10-backup-restore.md) | Backup & Restore | T1 | W-3 |
| [SPEC-11](03-specs/SPEC-11-automation.md) | Batch Job & Scheduler | T1 | W-5 |
| [SPEC-12](03-specs/SPEC-12-server-security.md) | User / Role / Privilege | T1/T2 | W-5 |
| [SPEC-13](03-specs/SPEC-13-nosql-and-monitoring.md) | MongoDB, Redis, Server Monitor | T2 | W-5/W-7 |
| [SPEC-14](03-specs/SPEC-14-ai-assistant.md) | AI Assistant | T2 | W-8 |
| [SPEC-15](03-specs/SPEC-15-shell-and-settings.md) | Shell, Settings, Workspace | T0 | W-0/W-2 |

---

## Ba quyết định kiến trúc quan trọng nhất

Nếu chỉ đọc được 3 điều, hãy đọc 3 điều này:

1. **Trình duyệt không mở được TCP socket tới MySQL/PostgreSQL.** Vì vậy toàn bộ driver chạy
   trong Node. Web app gọi qua HTTP/WebSocket tới `@corvus/engine`; desktop app gọi qua
   Electron IPC tới **chính `@corvus/engine` đó** nhúng trong main process.
   → [ADR-0002](02-architecture/adr/ADR-0002-transport-agnostic-rpc.md)

2. **UI không bao giờ biết mình đang chạy ở web hay desktop.** Nó chỉ phụ thuộc vào interface
   `Transport`. Việc chọn `HttpTransport` hay `IpcTransport` xảy ra đúng **một chỗ duy nhất**
   ở bootstrap. → [rpc-contract.md](02-architecture/rpc-contract.md)

3. **Sự khác biệt giữa 8 database engine được biểu diễn bằng dữ liệu, không phải bằng `if`.**
   Mỗi driver khai báo một `CapabilitySet`; UI đọc capability để bật/tắt chức năng.
   → [driver-spi.md](02-architecture/driver-spi.md)

---

## Quy ước mã định danh

| Tiền tố | Ý nghĩa | Ví dụ |
|---|---|---|
| `ADR-nnnn` | Architecture Decision Record | `ADR-0003` |
| `SPEC-nn` | Đặc tả chức năng module | `SPEC-03` |
| `FR-nn.mm` | Yêu cầu chức năng trong SPEC | `FR-03.12` |
| `NFR-nn` | Yêu cầu phi chức năng | `NFR-04` |
| `W-n` | Wave phát hành | `W-3` |
| `E-nnn` | Epic | `E-012` |
| `T-nnn` | Task thực thi được | `T-047` |
| `CAP.xxx` | Capability flag của driver | `CAP.materializedView` |

Mọi commit, PR, và tên branch **phải** tham chiếu ít nhất một mã `T-nnn`.

---

## Trạng thái tài liệu

| Tài liệu | Trạng thái | Cập nhật |
|---|---|---|
| Toàn bộ `docs/` | 🟢 v1.0 — sẵn sàng thực thi | 2026-08-17 |

Khi thay đổi kiến trúc: **ghi ADR mới, không sửa ADR cũ** (chỉ đổi trạng thái sang
`Superseded by ADR-nnnn`).
