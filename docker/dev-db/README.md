# Dev DB Environment (docker/dev-db)

Môi trường database phát triển phục vụ cho phát triển cục bộ và kiểm thử tích hợp trên dữ liệu thật.

## Baseline

Thời gian đo kiểm thử tích hợp trên đường testcontainers ban đầu (trước khi chuyển đổi sang stack Docker cố định):

- **Thời điểm đo**: 2026-08-21
- **Lệnh thực hiện**: `pnpm test:it` (`turbo run test:integration`)
- **Tổng thời gian thực thi turbo**: 5m 9.691s (309.69s)

### Chi tiết từng package

| Package | Test Files | Tests (Passed/Failed/Total) | Thời gian chạy | Ghi chú |
|---|---|---|---|---|
| `@corvus/driver-postgres` | 1 | 80 / 0 / 80 | 25.67s | testcontainers postgres:16-alpine |
| `@corvus/driver-mysql` | 1 | 65 / 0 / 65 | 71.63s | testcontainers mysql:8.0 |
| `@corvus/driver-mssql` | 4 | 51 / 43 / 94 | 255.61s | testcontainers mssql (lỗi do chưa có testenv dialect / missing schema/functions) |
| `@corvus/driver-oracle` | 4 | 32 / 61 / 93 | 306.25s | testcontainers oracle-free (lỗi do chưa có testenv dialect / missing schema/functions) |
| `@corvus/driver-mongodb` | 3 | 11 / 0 / 11 | 3.13s | Chỉ có unit test (A-06: chưa có integration test thật) |
| `@corvus/driver-redis` | 3 | 10 / 0 / 10 | 3.03s | Chỉ có unit test (A-06: chưa có integration test thật) |
| `@corvus/engine` | 7 | 58 / 0 / 58 | 118.74s | testcontainers postgres/mysql |
| `@corvus/app-web-server` | 2 | 29 / 0 / 29 | 41.70s | WebSocket & HTTP streaming |

> Mốc baseline này dùng để đối chiếu chứng minh tiêu chí **SC-006** (cải thiện thời gian chạy integration test ≥ 60% sau khi chuyển sang stack cố định ở local).
