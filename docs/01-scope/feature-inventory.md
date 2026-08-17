# Feature Inventory — Navicat → Corvus DB Studio

Bảng kiểm kê **toàn bộ** tính năng trong Navicat User Guide (384 trang, 22 chương), ánh xạ
sang module Corvus, gán tier ưu tiên và wave phát hành.

## Quy ước

**Tier**

| Tier | Ý nghĩa | Nguyên tắc |
|---|---|---|
| **T0** | Xương sống — không có thì sản phẩm vô nghĩa | Bắt buộc trong MVP |
| **T1** | Cốt lõi — người dùng hằng ngày cần | Bắt buộc trước 1.0 |
| **T2** | Nâng cao — tạo khác biệt cạnh tranh | Sau 1.0 |
| **T3** | Chuyên biệt / thị trường ngách | Backlog dài hạn |
| **T4** | Không làm | Xem [scope-decisions.md](scope-decisions.md) |

**Engine**: `MY`=MySQL/MariaDB, `PG`=PostgreSQL, `MS`=SQL Server, `OR`=Oracle,
`LT`=SQLite, `MG`=MongoDB, `RD`=Redis, `SF`=Snowflake.

---

## Ch.1–2 · Shell & User Interface

| # | Tính năng Navicat | Module Corvus | Tier | Wave | Ghi chú |
|---|---|---|---|---|---|
| 1.1 | Main Window (toolbar / tab bar / status bar) | `ui/shell` | T0 | W0 | ✅ đã có trong UI shell |
| 1.2 | Navigation Pane (cây connection→db→object) | `ui/navigation` | T0 | W0 | UI có, cần nối dữ liệu thật |
| 1.3 | Object Pane — List view | `ui/objects` | T0 | W0 | ✅ có |
| 1.4 | Object Pane — Detail view (chọn cột hiển thị) | `ui/objects` | T1 | W2 | |
| 1.5 | Object Pane — ER Diagram view | `ui/er` | T1 | W4 | UI tĩnh đã có |
| 1.6 | Information Pane — General / DDL / Preview | `ui/info` | T0 | W0–W1 | ✅ khung có |
| 1.7 | Information Pane — Using / Used By (dependency) | `ui/info` | T2 | W5 | |
| 1.8 | Information Pane — Members / Privileges | `ui/info` | T2 | W5 | |
| 1.9 | Information Pane — Identifiers / Code Snippet | `ui/info` | T1 | W1 | Feed cho code completion |
| 1.10 | Dark Theme | `ui/theme` | T0 | W0 | ✅ có |
| 1.11 | Search Filter trên mọi tree | `ui/*` | T1 | W1 | |
| 1.12 | Focus Mode (fullscreen 1 form) | `ui/shell` | T2 | W6 | |
| 1.13 | Pane maximize / restore | `ui/shell` | T2 | W2 | Resize đã có |

## Ch.3 · Collaboration

| # | Tính năng | Module | Tier | Wave | Ghi chú |
|---|---|---|---|---|---|
| 3.1 | Cloud / On-Prem Server đồng bộ profile | `engine/sync` | T2 | W9 | Corvus dùng self-hosted sync server |
| 3.2 | Projects & Members | `engine/project` | T2 | W9 | Trên web là first-class (multi-user) |
| 3.3 | Push synchronization | `engine/sync` | T3 | W9 | |
| 3.4 | Cache & local copies | `engine/sync` | T3 | W9 | |

## Ch.4 · Connection

| # | Tính năng | Module | Tier | Wave | Engine |
|---|---|---|---|---|---|
| 4.1 | Tạo/sửa/xoá/nhân bản connection profile | `engine/connection` | T0 | W0 | tất cả |
| 4.2 | General settings theo từng engine | `engine/connection` | T0 | W0/W7 | tất cả |
| 4.3 | Advanced settings (encoding, keepalive, timeout) | `engine/connection` | T1 | W1 | tất cả |
| 4.4 | SSL/TLS settings (CA, cert, key, verify mode) | `engine/tunnel` | T0 | W0 | MY PG MS MG RD |
| 4.5 | SSH tunnel (password / private key / passphrase) | `engine/tunnel` | T0 | W1 | MY PG MS OR MG |
| 4.6 | HTTP tunnel (script phía server) | `engine/tunnel` | T4 | — | Không làm — xem scope-decisions |
| 4.7 | Connect với nhiều profile (dev/stg/prod) | `engine/connection` | T2 | W5 | |
| 4.8 | Connection từ URI | `engine/connection` | T1 | W2 | |
| 4.9 | Connection coloring | `ui/navigation` | T1 | W2 | |
| 4.10 | Test connection | `engine/connection` | T0 | W0 | |
| 4.11 | Read-only connection mode | `engine/connection` | T1 | W1 | **Corvus bổ sung** (Navicat không có) |

## Ch.5 · Server Objects

| # | Nhóm đối tượng | Module | Tier | Wave | Engine |
|---|---|---|---|---|---|
| 5.1 | Database / Schema: liệt kê, tạo, sửa, xoá | `engine/introspect` + `ui/objects` | T0 | W0 | tất cả |
| 5.2 | Table: liệt kê + Table Designer (field/index/FK/trigger/option) | `ui/designer` | T0 | W2 | RDBMS |
| 5.3 | View: liệt kê + View Designer | `ui/designer` | T1 | W2 | RDBMS |
| 5.4 | Materialized View | `ui/designer` | T2 | W6 | PG OR SF |
| 5.5 | Procedure / Function Designer | `ui/designer` | T1 | W3 | RDBMS |
| 5.6 | Package (Oracle) | `ui/designer` | T3 | W8 | OR |
| 5.7 | Trigger / Event / Sequence / Domain / Type | `ui/designer` | T2 | W6 | tuỳ engine |
| 5.8 | Tablespace, Foreign Server, Extension | `ui/designer` | T3 | W8 | PG OR |
| 5.9 | Recycle Bin | `ui/objects` | T3 | W8 | OR |
| 5.10 | Maintain Objects (analyze/optimize/repair/vacuum/checksum) | `engine/maintain` | T1 | W3 | tuỳ engine |
| 5.11 | MongoDB: collection / index / GridFS / MapReduce | `driver/mongodb` | T2 | W7 | MG |
| 5.12 | Redis: database / key browser | `driver/redis` | T2 | W7 | RD |

## Ch.6 · Data Editor

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 6.1 | Grid View — hiển thị dạng lưới, virtualized | `ui/grid` | T0 | W1 |
| 6.2 | Thêm / sửa / xoá record | `ui/grid` + `engine/dml` | T0 | W1 |
| 6.3 | Apply / Discard changes | `ui/grid` | T0 | W1 |
| 6.4 | Transaction: Begin / Commit / Rollback | `engine/tx` | T1 | W1 |
| 6.5 | Navigation bar (first/prev/next/last page & record) | `ui/grid` | T0 | W1 |
| 6.6 | Limit records per page | `ui/grid` | T0 | W1 |
| 6.7 | Form View (1 record / màn hình) | `ui/form` | T1 | W2 |
| 6.8 | Cell editor theo kiểu: text, memo, date/time, enum, set, bit | `ui/celleditor` | T1 | W2 |
| 6.9 | Cell editor: BLOB / image / hex / JSON / XML | `ui/celleditor` | T2 | W3 |
| 6.10 | Set to NULL / Empty String | `ui/grid` | T1 | W1 |
| 6.11 | Foreign Key Data Selection (chọn từ bảng tham chiếu) | `ui/grid` | T2 | W4 |
| 6.12 | Sort theo cột (asc/desc/remove) | `ui/grid` | T0 | W1 |
| 6.13 | Filter & Sort pane (builder + text mode) | `ui/filter` | T0 | W1 | ✅ UI đã có |
| 6.14 | Custom filter nhanh từ giá trị cell | `ui/grid` | T1 | W2 |
| 6.15 | Find / Replace trong dữ liệu | `ui/grid` | T1 | W2 |
| 6.16 | Copy / Paste (TSV, Insert stmt, Update stmt) | `ui/grid` | T1 | W2 |
| 6.17 | Save data as file | `ui/grid` | T2 | W3 |
| 6.18 | Show/Hide columns, đóng băng cột | `ui/grid` | T1 | W2 |
| 6.19 | Table Profile (lưu filter/sort/column) | `engine/profile` | T2 | W4 |
| 6.20 | Field information pane | `ui/info` | T1 | W2 |
| 6.21 | MongoDB Tree View / JSON View | `ui/mongo` | T2 | W7 |
| 6.22 | Redis key editor theo type (string/hash/list/set/zset/stream) | `ui/redis` | T2 | W7 |

## Ch.7 · Data Profiling

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 7.1 | Thống kê cột: count/distinct/null/min/max/avg/percentile | `engine/profiling` | T2 | W8 |
| 7.2 | Biểu đồ phân phối giá trị | `ui/profiling` | T2 | W8 |
| 7.3 | Phát hiện outlier | `engine/profiling` | T3 | W8 |

## Ch.8 · Query

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 8.1 | SQL Editor (CodeMirror 6) | `ui/editor` | T0 | W1 |
| 8.2 | Syntax highlight theo dialect | `ui/editor` | T0 | W1 |
| 8.3 | Chạy toàn bộ / chạy statement tại con trỏ / chạy vùng chọn | `engine/query` | T0 | W1 |
| 8.4 | Nhiều result set + tab Messages / Profile | `ui/results` | T0 | W1 |
| 8.5 | Code completion (schema-aware, `.` trigger) | `ui/editor` | T1 | W2 |
| 8.6 | Code folding, brace highlight, word wrap, zoom | `ui/editor` | T1 | W2 |
| 8.7 | Beautify / Minify SQL, convert case, indent, comment | `engine/format` | T1 | W2 |
| 8.8 | Find / Replace (regex, whole word, match case) | `ui/editor` | T1 | W2 |
| 8.9 | Query Parameters (`$name`, prompt khi chạy) | `engine/query` | T2 | W4 |
| 8.10 | Explain / Explain Analyze + hiển thị dạng cây | `ui/explain` | T1 | W3 |
| 8.11 | Query Builder trực quan (FROM/SELECT/WHERE/GROUP/HAVING/ORDER) | `ui/querybuilder` | T2 | W4 |
| 8.12 | Code Snippets (built-in + custom) | `engine/snippet` | T2 | W4 |
| 8.13 | Lưu query vào workspace / mở file ngoài | `engine/workspace` | T1 | W2 |
| 8.14 | Clipboard stack | `ui/editor` | T3 | W8 |
| 8.15 | MongoDB query editor + Find/Aggregate builder | `ui/mongo` | T2 | W7 |
| 8.16 | Redis command editor | `ui/redis` | T2 | W7 |
| 8.17 | Query history | `engine/history` | T1 | W2 | **Corvus bổ sung** |

## Ch.9 · AI Assistant

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 9.1 | Chat với AI trong Information Pane | `ui/ai` | T2 | W8 |
| 9.2 | Ask AI: sinh SQL từ ngôn ngữ tự nhiên | `engine/ai` | T2 | W8 |
| 9.3 | Fix Query with AI | `engine/ai` | T2 | W8 |
| 9.4 | Giải thích execution plan | `engine/ai` | T2 | W8 |
| 9.5 | Cấu hình provider & khoá API (Anthropic/OpenAI/local) | `engine/ai` | T2 | W8 |
| 9.6 | Ranh giới quyền: chỉ gửi schema, không gửi dữ liệu dòng | `engine/ai` | T2 | W8 | Bắt buộc — xem [security.md](../02-architecture/security.md) |

## Ch.10 · Model (Data Modeling)

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 10.1 | Physical model — relational (table/view/relation) | `ui/model` | T2 | W6 |
| 10.2 | Diagram canvas: thêm/di chuyển/tô màu/layer | `ui/model` | T2 | W6 |
| 10.3 | Auto layout | `ui/model` | T2 | W6 |
| 10.4 | Reverse engineering: DB → model | `engine/model` | T2 | W6 |
| 10.5 | Forward engineering: model → DDL / sync vào DB | `engine/model` | T2 | W6 |
| 10.6 | Export diagram (PNG/SVG/PDF) | `ui/model` | T2 | W6 |
| 10.7 | Conceptual / Logical model | `ui/model` | T3 | W9 |
| 10.8 | Dimensional model (fact/dimension/outrigger) | `ui/model` | T3 | — |
| 10.9 | Data Vault model (hub/link/satellite/bridge/PIT) | `ui/model` | T4 | — | Không làm |
| 10.10 | Compare model workspace | `engine/model` | T3 | W9 |

## Ch.11–13 · Debugger, Pub/Sub, Aggregation Pipeline

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 11.1 | PL/SQL debugger (Oracle) | `engine/debug` | T4 | — | Không làm |
| 11.2 | PL/pgSQL debugger (PostgreSQL) | `engine/debug` | T3 | W9 |
| 12.1 | Redis Pub/Sub monitor | `ui/redis` | T3 | W7 |
| 13.1 | MongoDB Aggregation Pipeline builder | `ui/mongo` | T2 | W7 |

## Ch.14 · Data Migration Tools

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 14.1 | **Import Wizard** — CSV/TSV/TXT | `engine/import` | T1 | W3 |
| 14.2 | Import — JSON / XML | `engine/import` | T1 | W3 |
| 14.3 | Import — Excel (xlsx) | `engine/import` | T2 | W3 |
| 14.4 | Import — DBF / MS Access / ODBC | `engine/import` | T4 | — | Không làm |
| 14.5 | Import: delimiter, qualifier, encoding, fixed-width | `engine/import` | T1 | W3 |
| 14.6 | Import: chọn bảng đích, map field, đổi kiểu | `ui/import` | T1 | W3 |
| 14.7 | Import mode: append / update / append-or-update / delete / copy | `engine/import` | T1 | W3 |
| 14.8 | Import advanced: extended insert, batch size, continue on error | `engine/import` | T1 | W3 |
| 14.9 | **Export Wizard** — CSV/TXT/JSON/XML/SQL/HTML/Markdown | `engine/export` | T1 | W3 |
| 14.10 | Export — Excel (xlsx) | `engine/export` | T2 | W3 |
| 14.11 | Export: chọn cột, encoding, timestamp filename, append | `engine/export` | T1 | W3 |
| 14.12 | **Data Transfer** giữa 2 connection | `engine/transfer` | T2 | W6 |
| 14.13 | **Data Synchronization** (so sánh + sinh script) | `engine/datasync` | T2 | W6 | UI Compare A⇄B đã có |
| 14.14 | **Structure Synchronization** | `engine/structsync` | T2 | W6 |
| 14.15 | Dump SQL file / Execute SQL file | `engine/sqlfile` | T1 | W3 |
| 14.16 | MongoImport / MongoExport | `driver/mongodb` | T3 | W7 |
| 14.17 | Profile lưu cấu hình import/export dùng lại | `engine/profile` | T1 | W3 |

## Ch.15 · Data Generation

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 15.1 | Chọn bảng + cột, tôn trọng FK order | `engine/datagen` | T2 | W6 |
| 15.2 | Generator cơ bản: number, date/time, sequence, enum, text, UUID, regex | `engine/datagen` | T2 | W6 |
| 15.3 | Generator FK (lấy giá trị từ bảng cha) | `engine/datagen` | T2 | W6 |
| 15.4 | Generator hồ sơ người: name, gender, title, phone, email, job | `engine/datagen` | T3 | W6 |
| 15.5 | Generator thương mại: payment, credit card, company, product, SKU, barcode | `engine/datagen` | T3 | W6 |
| 15.6 | Generator kỹ thuật: IP, MAC, file path, URL, hostname | `engine/datagen` | T3 | W6 |
| 15.7 | Preview trước khi sinh | `ui/datagen` | T2 | W6 |

## Ch.16 · Data Dictionary

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 16.1 | Sinh tài liệu schema (HTML / PDF / Markdown) | `engine/datadict` | T2 | W6 |
| 16.2 | Chọn object, đổi thứ tự, chọn template | `ui/datadict` | T2 | W6 |

## Ch.17 · BI

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 17.1 | Data Source (từ table / query / file) | `engine/bi` | T3 | W9 |
| 17.2 | Chart builder + 16 loại chart | `ui/bi` | T3 | W9 |
| 17.3 | Dashboard (page, layout, text, image, shape) | `ui/bi` | T3 | W9 |
| 17.4 | Present / Export dashboard | `ui/bi` | T3 | W9 |
| 17.5 | Custom field, aggregate, range, control | `engine/bi` | T3 | W9 |

## Ch.18 · Automation

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 18.1 | Batch job: gom nhiều job (query/backup/import/export/transfer/sync/datagen) | `engine/automation` | T1 | W5 |
| 18.2 | Lập lịch cron | `engine/scheduler` | T1 | W5 |
| 18.3 | Continue on error | `engine/automation` | T1 | W5 |
| 18.4 | Email notification (SMTP, TLS, attachment) | `engine/notify` | T2 | W5 |
| 18.5 | Message log + lịch sử chạy | `ui/automation` | T1 | W5 | UI đã có |
| 18.6 | Chạy batch job từ CLI | `apps/cli` | T2 | W5 |
| 18.7 | Webhook / Slack notification | `engine/notify` | T2 | W5 | **Corvus bổ sung** |

## Ch.19 · Backup & Restore

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 19.1 | Backup logic built-in (MY/PG/LT) — chọn object, comment | `engine/backup` | T1 | W3 | UI đã có |
| 19.2 | Backup advanced: lock tables, single transaction, tên file | `engine/backup` | T1 | W3 |
| 19.3 | Restore: chọn object, continue on error, create index/trigger/record | `engine/restore` | T1 | W3 |
| 19.4 | Extract SQL từ file backup | `engine/backup` | T2 | W3 |
| 19.5 | Nén gzip / zstd, verify sau khi ghi | `engine/backup` | T1 | W3 |
| 19.6 | Wrapper `mysqldump` / `pg_dump` khi có sẵn (nhanh hơn) | `engine/backup` | T2 | W5 |
| 19.7 | SQL Server BACKUP DATABASE / RESTORE | `driver/mssql` | T2 | W6 |
| 19.8 | Oracle Data Pump (expdp/impdp) | `driver/oracle` | T3 | W8 |
| 19.9 | MongoDump / MongoRestore | `driver/mongodb` | T3 | W7 |
| 19.10 | Redis backup (RDB copy / command dump) | `driver/redis` | T3 | W7 |

## Ch.20 · Server Security

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 20.1 | Liệt kê user / role | `engine/security` | T1 | W5 | UI dialog đã có |
| 20.2 | User Designer (tạo/sửa/xoá, đổi mật khẩu, host) | `ui/security` | T1 | W5 |
| 20.3 | Role / Group Designer | `ui/security` | T2 | W5 |
| 20.4 | Privilege Manager (grant/revoke theo object) | `ui/security` | T2 | W5 |
| 20.5 | SQL Server Login / Server Role / DB Role / App Role | `driver/mssql` | T2 | W6 |
| 20.6 | MongoDB / Redis user & role | `driver/*` | T3 | W7 |
| 20.7 | Xem trước SQL GRANT/REVOKE trước khi chạy | `ui/security` | T1 | W5 | **Corvus bổ sung — bắt buộc** |

## Ch.21 · Other Advanced Tools

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 21.1 | Server Monitor — process list, kill process | `ui/monitor` | T2 | W5 |
| 21.2 | Server Monitor — variables, status | `ui/monitor` | T2 | W5 |
| 21.3 | Schema Analysis (MongoDB) | `ui/mongo` | T3 | W7 |
| 21.4 | Command Monitor (Redis MONITOR) | `ui/redis` | T3 | W7 |
| 21.5 | Virtual Grouping | `engine/workspace` | T2 | W4 |
| 21.6 | Find in Database/Schema (data + structure) | `engine/search` | T2 | W4 |
| 21.7 | Console (CLI tương tác) | `ui/console` | T3 | W8 |
| 21.8 | Share via URI | `engine/uri` | T2 | W4 |
| 21.9 | Favorites | `engine/workspace` | T2 | W4 |

## Ch.22 · Configurations

| # | Tính năng | Module | Tier | Wave |
|---|---|---|---|---|
| 22.1 | Options: General (theme, tree behaviour, confirm dialog, update check) | `ui/settings` | T0 | W0 | ✅ khung có |
| 22.2 | Options: Tabs (open new tab in…, on startup) | `ui/settings` | T1 | W2 |
| 22.3 | Options: Code Completion | `ui/settings` | T1 | W2 |
| 22.4 | Options: Editor (line number, folding, wrap, tab width, font, màu syntax) | `ui/settings` | T1 | W2 |
| 22.5 | Options: Records (limit/page, auto begin transaction) | `ui/settings` | T1 | W1 |
| 22.6 | Options: Grid (font, display format date/time) | `ui/settings` | T1 | W2 |
| 22.7 | Options: Environment (đường dẫn client lib, dump tool) | `ui/settings` | T2 | W5 |
| 22.8 | Options: Proxy | `ui/settings` | T3 | W8 |
| 22.9 | Import/Export settings & profile | `engine/workspace` | T2 | W5 |
| 22.10 | Keyboard shortcut customization | `ui/settings` | T2 | W6 | **Corvus bổ sung** |

---

## Tổng hợp theo tier

| Tier | Số mục | Ước lượng (person-week) |
|---|---:|---:|
| T0 | 24 | 30 |
| T1 | 52 | 96 |
| T2 | 58 | 140 |
| T3 | 28 | 84 |
| T4 (không làm) | 6 | — |
| **Tổng làm** | **162** | **≈350 pw** |

Chi tiết ước lượng và giả định: [../04-plan/estimation.md](../04-plan/estimation.md).

---

## Tính năng Corvus bổ sung (không có trong Navicat)

Những mục này được thêm vì kiến trúc web-first hoặc vì yêu cầu an toàn:

| # | Tính năng | Lý do | Wave |
|---|---|---|---|
| X.1 | Read-only connection mode | Chống tai nạn trên production | W1 |
| X.2 | Query history có thể tìm kiếm | Không có sẽ mất công việc | W2 |
| X.3 | Xem trước SQL cho mọi thao tác phá huỷ (DDL/GRANT/DELETE) | An toàn | W2 |
| X.4 | Audit log toàn hệ thống | Bắt buộc cho web multi-user | W5 |
| X.5 | RBAC người dùng Corvus (khác với user của DB) | Web multi-user | W5 |
| X.6 | Webhook / Slack notification | Tích hợp CI/CD hiện đại | W5 |
| X.7 | Keyboard shortcut tuỳ biến | Khả dụng | W6 |
| X.8 | Scheduler nội bộ đa nền tảng | Navicat phụ thuộc Windows Task Scheduler | W5 |
