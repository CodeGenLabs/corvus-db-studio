import type { ResolvedProfile } from '../types'
import type { ConformanceDialect } from './dialect'

export interface ConformanceSuiteOptions {
  /** Profile trỏ tới server THẬT (thường do testcontainers cấp). */
  profile: ResolvedProfile
  /** SQL dựng schema mẫu trước khi chạy suite. */
  setupSql?: string
  /**
   * Tên schema chứa dữ liệu mẫu do `setupSql` tạo. Mặc định 'corvus_conf'.
   * Suite chỉ đọc trong schema này để không phụ thuộc trạng thái sẵn có của server.
   */
  schema?: string
  /** Bảng phải tồn tại sau setupSql — dùng cho C2. */
  fixtureTable?: string
  /**
   * Mô tả phần khác nhau của engine (`dialect.ts`). Mặc định là `POSTGRES_CONFORMANCE` để
   * file test PostgreSQL viết trước T-C00 không phải sửa.
   */
  dialect?: ConformanceDialect
}
