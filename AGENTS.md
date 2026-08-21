# AGENTS.md

Đây là **con trỏ**. Nội dung thật nằm trong `docs/`.

## Bắt buộc đọc trước khi viết dòng code đầu tiên

1. **[docs/05-rules/AGENTS.md](docs/05-rules/AGENTS.md)** — luật làm việc, quy trình, 10 điều cấm
2. **[docs/05-rules/coding-rules.md](docs/05-rules/coding-rules.md)** — quy tắc code
3. **[docs/02-architecture/overview.md](docs/02-architecture/overview.md)** — kiến trúc
4. **[docs/04-plan/backlog.md](docs/04-plan/backlog.md)** — tìm task `T-nnn` được giao

Toàn bộ bản đồ tài liệu: **[docs/README.md](docs/README.md)**

## Ba điều quan trọng nhất

1. `packages/ui` **không được** import `node:*`, `electron`, hay driver nào. Gọi RPC.
2. Không rẽ nhánh theo `driverId`. Rẽ nhánh theo `capabilities`.
3. Mọi thao tác ghi vào database phải đi qua **preview-token** — người dùng phải thấy SQL trước.

## Lệnh

```bash
pnpm verify        # lint + typecheck + test + build — BẮT BUỘC xanh trước khi báo xong
pnpm dev:web       # chạy bản web
pnpm dev:desktop   # chạy bản desktop
pnpm test:it       # integration test (cần Docker)
pnpm test:e2e      # E2E (Playwright)
```

> Trạng thái hiện tại: repo đã hoàn tất chuyển đổi sang Monorepo gồm **23 packages & apps**
> (Turborepo + pnpm). Chạy và phát triển bằng `pnpm dev:web` / `pnpm dev:desktop`, kiểm tra bằng `pnpm verify`.
