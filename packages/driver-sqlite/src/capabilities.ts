import type { CapabilitySet } from '@corvus/contract'
import type { ServerVersion } from '@corvus/driver-core'

/**
 * Capability CƠ SỞ của SQLite — mức thấp nhất mà mọi bản SQLite còn được dùng đều đạt.
 *
 * `narrowSqliteCapabilities()` mới là thứ connection dùng: nó MỞ thêm theo phiên bản thật
 * (capability-matrix.md §8). Nguyên tắc ở đây là "thà thiếu còn hơn khai khống"
 * (driver-spi.md §2) — khai khống làm UI hiện nút cho việc engine không làm được, và người
 * dùng chỉ biết khi bấm vào giữa lúc đang sửa dữ liệu production.
 */
export const SQLITE_CAPABILITIES: CapabilitySet = {
  hierarchy: {
    // ODQ-1: Đặt true vì listDatabases() trả về 'main' cùng các tệp đã ATTACH.
    // Nếu đặt false thì các database attach không có đường nào tới được trong cây điều hướng.
    hasCatalogs: true,
    // SQLite không có schema. `ATTACH` cho ra nhiều "database" nhưng đó là tầng catalog
    // theo cách UI hiểu, không phải schema.
    hasSchemas: false,
  },
  objects: {
    table: true,
    view: true,
    materializedView: false,
    procedure: false,
    function: false,
    package: false,
    trigger: true,
    sequence: false,
    index: true,
    domain: false,
    type: false,
    event: false,
    collection: false,
    keyspace: false,
  },
  sql: {
    parameterStyle: 'question',
    identifierQuote: '"',
    limitSyntax: 'limit-offset',
    // SQLite không đặt trần cho độ dài định danh. Dùng một số lớn nhưng hữu hạn để chỗ
    // nào validate độ dài cũng có con số dùng được.
    maxIdentifierLength: 65_535,
    caseSensitivity: 'insensitive',
    cte: false,
    windowFunctions: false,
    returning: false,
    upsert: 'none',
  },
  exec: {
    streamingCursor: true,
    // `better-sqlite3` chạy MỘT câu lệnh cho mỗi `prepare()`. Nhiều câu lệnh phải được
    // tách trước (`splitStatements`). Khai `true` sẽ làm UI gửi cả script và nhận lỗi.
    multipleStatements: false,
    multipleResultSets: false,
    // API đồng bộ, không có `interrupt()` → không cắt được một câu lệnh đang chạy.
    // Huỷ giữa các dòng thì được, nhưng bảo đảm "≤ 200 ms" của driver-spi §5 thì không.
    cancelStatement: false,
    explain: true,
    // `EXPLAIN QUERY PLAN` chỉ cho kế hoạch, không có số đo thực thi.
    explainAnalyze: false,
    preparedStatements: true,
  },
  tx: {
    supported: true,
    savepoints: true,
    // Điểm mạnh thật của SQLite: DDL nằm trong transaction được, rollback được.
    ddlTransactional: true,
    isolationLevels: 2,
  },
  tools: {
    logicalBackup: true,
    // `db.backup()` sao chép nhất quán ngay khi đang có ghi — bản sao vật lý thật.
    physicalBackup: true,
    userManagement: false,
    roleManagement: false,
    processMonitor: false,
    serverVariables: true,
    dataGeneration: true,
    // SQLite không có profiler phía server. Khai `false` thay vì để UI hiện tab trống.
    profiling: false,
  },
}

/** So sánh phiên bản: trả true khi `v` ≥ major.minor.patch. */
function atLeast(v: ServerVersion, major: number, minor: number, patch = 0): boolean {
  if (v.major !== major) return v.major > major
  if (v.minor !== minor) return v.minor > minor
  return v.patch >= patch
}

/**
 * Thu hẹp / mở rộng capability theo phiên bản SQLite THẬT của tệp đang mở
 * (SPEC-01 §7 · capability-matrix.md §8).
 *
 * Ba mốc dưới đây là lý do bắt buộc phải làm việc này chứ không dùng bảng tĩnh: cùng một
 * driver, chạy trên tệp mở bằng SQLite 3.20 và 3.40 thì tập tính năng khác nhau thật.
 */
export function narrowSqliteCapabilities(version: ServerVersion): CapabilitySet {
  return {
    ...SQLITE_CAPABILITIES,
    sql: {
      ...SQLITE_CAPABILITIES.sql,
      cte: atLeast(version, 3, 8, 3),
      windowFunctions: atLeast(version, 3, 25),
      returning: atLeast(version, 3, 35),
      upsert: atLeast(version, 3, 24) ? 'on-conflict' : 'none',
    },
  }
}
