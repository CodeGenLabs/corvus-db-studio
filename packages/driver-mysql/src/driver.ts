import { corvusError } from '@corvus/contract'
import {
  NotImplementedConnection,
  notImplemented,
  type DatabaseDriver,
  type DriverConnection,
  type DriverContext,
  type ResolvedProfile,
} from '@corvus/driver-core'
import { MYSQL_CAPABILITIES } from './capabilities'

/**
 * Driver MySQL / MariaDB — CHƯA HIỆN THỰC.
 *
 * Bản trước trả dữ liệu giả hard-code (`['sakila','world','employees','sys']`) khiến UI
 * trông như đang kết nối thật. coding-rules §3.8 cấm điều đó: driver chưa làm phải ném
 * `UNSUPPORTED_FEATURE`. Xem audit 2026-08-18 và task R-06.
 *
 * Khi hiện thực (theo thứ tự trong driver-spi.md §9):
 *   1. Pool `mysql2/promise`, đọc `@@version` và `@@lower_case_table_names` lúc connect
 *      để thu hẹp `capabilities` theo server thật (SPEC-01 §7)
 *   2. Introspector truy vấn gộp vào `information_schema` — KHÔNG N+1
 *   3. `execute` dùng `connection.query(...).stream()`, không buffer cả result set
 *   4. Ánh xạ lỗi ≥ 20 mã (errno của MySQL) trong errors.ts
 *   5. Chuẩn hoá giá trị về `CellValue` (BIGINT luôn là string)
 */
export class MysqlDriver implements DatabaseDriver {
  readonly id = 'mysql' as const
  readonly displayName = 'MySQL / MariaDB'
  readonly capabilities = MYSQL_CAPABILITIES
  readonly defaultPort = 3306

  async connect(profile: ResolvedProfile, _ctx?: DriverContext): Promise<DriverConnection> {
    if (!profile.host) {
      throw corvusError('INVALID_INPUT', 'Thiếu host cho kết nối MySQL')
    }
    return notImplemented(this.id, 'connect (chưa nối mysql2 — xem R-06/R-07)')
  }
}

/**
 * Connection rỗng, dùng cho test vòng đời session mà không cần server thật.
 * KHÔNG dùng để giả lập dữ liệu — mock dữ liệu chỉ được ở `@corvus/transport-mock`.
 */
export class MysqlConnection extends NotImplementedConnection {
  constructor() {
    super(
      'mysql',
      { raw: 'unknown', major: 0, minor: 0, patch: 0 },
      MYSQL_CAPABILITIES,
      'mysql',
    )
  }
}

export const mysqlDriver = new MysqlDriver()
