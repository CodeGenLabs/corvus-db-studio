import { corvusError } from '@corvus/contract'
import type {
  DriverConnection,
  ExecuteRequest,
  Introspector,
  ResultChunk,
  StatementHandle,
  TableMeta,
  Transaction,
  TxOptions,
} from './types'

/**
 * Ném lỗi cho phần driver chưa hiện thực.
 *
 * coding-rules §3.8: driver chưa làm thì ném `UNSUPPORTED_FEATURE`, **không** trả dữ liệu giả.
 * Dữ liệu giả trong driver làm UI trông như đang chạy và che mất việc chưa có kết nối thật —
 * đúng lỗi đã xảy ra trong audit 2026-08-18.
 */
export function notImplemented(driverId: string, what: string): never {
  throw corvusError(
    'UNSUPPORTED_FEATURE',
    `Driver "${driverId}" chưa hiện thực: ${what}`,
    { i18nKey: 'error.driverNotImplemented', detail: `driver=${driverId} feature=${what}` },
  )
}

/**
 * Introspector rỗng cho driver chưa hiện thực. Mọi method đều ném.
 * Dùng làm điểm khởi đầu khi thêm engine mới (driver-spi.md §9).
 */
export class NotImplementedIntrospector implements Introspector {
  constructor(private readonly driverId: string) {}

  listDatabases(): Promise<string[]> {
    return notImplemented(this.driverId, 'introspect.listDatabases')
  }
  listSchemas(): Promise<string[]> {
    return notImplemented(this.driverId, 'introspect.listSchemas')
  }
  listObjects(): Promise<Array<{ name: string; kind: string }>> {
    return notImplemented(this.driverId, 'introspect.listObjects')
  }
  getTableMeta(): Promise<TableMeta> {
    return notImplemented(this.driverId, 'introspect.getTableMeta')
  }
  getDdl(): Promise<string> {
    return notImplemented(this.driverId, 'introspect.getDdl')
  }
}

/**
 * Connection rỗng cho driver chưa hiện thực. `close()` và `ping()` hoạt động thật
 * (không có gì để đóng) để vòng đời session không bị treo; còn lại đều ném.
 */
export class NotImplementedConnection implements DriverConnection {
  readonly introspect: Introspector

  constructor(
    readonly driverId: DriverConnection['driverId'],
    readonly serverVersion: DriverConnection['serverVersion'],
    readonly capabilities: DriverConnection['capabilities'],
    readonly dialect: DriverConnection['dialect'],
  ) {
    this.introspect = new NotImplementedIntrospector(driverId)
  }

  execute(_req: ExecuteRequest): AsyncIterable<ResultChunk> {
    return notImplemented(this.driverId, 'execute')
  }
  beginTransaction(_opts?: TxOptions): Promise<Transaction> {
    return notImplemented(this.driverId, 'beginTransaction')
  }
  cancel(_handle: StatementHandle): Promise<void> {
    return notImplemented(this.driverId, 'cancel')
  }
  async ping(): Promise<number> {
    return 0
  }
  async close(): Promise<void> {
    /* không có tài nguyên nào để giải phóng */
  }
}
