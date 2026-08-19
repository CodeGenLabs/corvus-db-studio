import type { ResolvedProfile } from '../types'

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
}
