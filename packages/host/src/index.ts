/**
 * `@corvus/host` — chỗ ở duy nhất của phần dựng engine thật cho một tiến trình host.
 *
 * Vì sao là một package riêng: `apps/web/server` và `apps/desktop/main` cần **cùng một**
 * engine (workspace SQLite + vault + 7 driver + router có handler), nhưng app không import
 * được app. Trước đây chỉ web server có phần nối thật, còn `apps/desktop/main` dùng
 * `createMockTransport()` làm backend RPC — nghĩa là toàn bộ bản desktop, kể cả bản đóng
 * gói, chạy trên dữ liệu giả (spec 002 phát hiện A-11).
 *
 * Nhân bản `buildEngine()` sang desktop chính là nguyên nhân gốc của loại lỗi đó, nên
 * ranh giới package này được người phụ trách phê duyệt 2026-08-21 theo
 * docs/05-rules/AGENTS.md §2 điều cấm #8.
 *
 * Package này **chỉ** dành cho tiến trình host (Node/Electron main). Không import từ
 * `packages/ui` hay `packages/client` — nó kéo theo cả 7 native driver.
 */
export { buildEngine, type BuiltEngine } from './engine'
