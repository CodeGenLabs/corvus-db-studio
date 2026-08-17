# Hợp đồng RPC transport-agnostic

> Đây là **khớp nối trung tâm** của cả hệ thống. Nếu chỉ có một tài liệu kiến trúc được đọc kỹ,
> phải là tài liệu này.

---

## 1. Nguyên tắc

1. Mọi thứ UI cần từ engine đều đi qua **đúng một** interface: `Transport`.
2. `Transport` có **đúng ba** khả năng: `request`, `stream`, `subscribe`. Không có gì khác.
3. Mọi method được khai báo **một lần** bằng zod schema trong `@corvus/contract`, sinh ra
   type cho cả client lẫn server. Không có type nào bị khai báo hai lần.
4. Engine **luôn** validate params ở runtime, kể cả khi TypeScript đã "bảo đảm". Client desktop
   nằm cùng process nhưng vẫn không được tin.

---

## 2. Interface `Transport`

```ts
// packages/contract/src/transport.ts

export interface Transport {
  /** Gọi-đáp một lần. Dùng cho ~95% method. */
  request<M extends UnaryMethod>(
    method: M,
    params: ParamsOf<M>,
    opts?: CallOptions,
  ): Promise<ResultOf<M>>

  /** Dòng chunk có thứ tự, huỷ được. Dùng cho result set và log job. */
  stream<M extends StreamMethod>(
    method: M,
    params: ParamsOf<M>,
    opts?: CallOptions,
  ): AsyncIterable<ChunkOf<M>>

  /** Sự kiện do server đẩy, không do client hỏi. */
  subscribe<T extends TopicName>(
    topic: T,
    handler: (event: EventOf<T>) => void,
  ): Unsubscribe

  /** Trạng thái đường truyền, để UI hiện banner "mất kết nối". */
  readonly status: TransportStatus     // 'connecting' | 'ready' | 'reconnecting' | 'closed'
  onStatusChange(cb: (s: TransportStatus) => void): Unsubscribe
}

export interface CallOptions {
  signal?: AbortSignal
  timeoutMs?: number
  /** Idempotency key — cho phép retry an toàn sau khi mạng đứt. */
  requestId?: string
}
```

Chỉ có 3 hiện thực: `transport-http`, `transport-ipc`, `transport-mock`.
**Không được thêm hiện thực thứ tư mà không có ADR.**

---

## 3. Khai báo một method

```ts
// packages/contract/src/methods/query.ts
import { z } from 'zod'
import { defineStream, defineUnary } from '../define'
import { ResultChunk, QueryStats } from '../models/result'

export const queryExecute = defineStream({
  name: 'query.execute',
  params: z.object({
    connectionId: z.string().uuid(),
    /** SQL nguyên văn. KHÔNG được ghép identifier vào đây ở phía UI. */
    sql: z.string().max(4_000_000),
    params: z.array(z.unknown()).optional(),
    /** Số dòng tối đa mỗi chunk. Engine có quyền giảm. */
    chunkSize: z.number().int().min(1).max(10_000).default(1_000),
    /** Cắt kết quả ở N dòng, tránh kéo về cả bảng do nhầm. */
    maxRows: z.number().int().positive().optional(),
    transactionId: z.string().uuid().optional(),
  }),
  chunk: ResultChunk,
  /** Quyền cần có. AuthContext kiểm tra trước khi router gọi handler. */
  permission: 'query:execute',
  /** Ghi audit ở mức nào. */
  audit: 'full',
  /** Method này bị chặn khi connection ở chế độ read-only và SQL là DML/DDL. */
  guard: 'writeGuard',
})

export const queryExplain = defineUnary({
  name: 'query.explain',
  params: z.object({
    connectionId: z.string().uuid(),
    sql: z.string(),
    analyze: z.boolean().default(false),
  }),
  result: z.object({
    format: z.enum(['tree', 'json', 'text']),
    plan: z.unknown(),
    raw: z.string(),
  }),
  permission: 'query:explain',
  audit: 'metadata',
})
```

Registry gom tất cả:

```ts
// packages/contract/src/index.ts
export const METHODS = {
  ...connectionMethods,
  ...introspectMethods,
  ...queryMethods,
  ...dataMethods,
  ...ddlMethods,
  ...jobMethods,
  ...securityMethods,
  ...workspaceMethods,
} as const

export type MethodName = keyof typeof METHODS
```

**Test bắt buộc** (`tools/check-contract.ts`, chạy ở CI):
- mọi `MethodName` đều có handler đăng ký trong `@corvus/engine`
- mọi handler đều có method tương ứng trong contract
- mọi method đều có ít nhất một test qua `transport-mock`

---

## 4. Danh mục method (bản đầy đủ cho v1.0)

### `connection.*`
| Method | Kiểu | Mô tả |
|---|---|---|
| `connection.list` | unary | Danh sách profile (không kèm secret) |
| `connection.get` | unary | Chi tiết một profile |
| `connection.create` / `.update` / `.delete` / `.duplicate` | unary | CRUD profile |
| `connection.test` | unary | Thử kết nối, trả về version + latency |
| `connection.open` / `.close` | unary | Mở/đóng session thực |
| `connection.status` | unary | Trạng thái pool |
| `connection.parseUri` / `.toUri` | unary | Chuyển đổi URI |

### `introspect.*`
| Method | Mô tả |
|---|---|
| `introspect.databases` | Danh sách database/catalog |
| `introspect.schemas` | Schema trong database |
| `introspect.objects` | Object trong schema, lọc theo `kind` |
| `introspect.tableMeta` | Cột, index, FK, trigger, option, comment |
| `introspect.routineMeta` | Tham số + body |
| `introspect.ddl` | DDL sinh ra cho object |
| `introspect.dependencies` | Using / Used By |
| `introspect.identifiers` | Feed cho code completion (cache được) |

### `data.*`
| Method | Kiểu | Mô tả |
|---|---|---|
| `data.browse` | stream | Đọc dữ liệu bảng có filter/sort/paging |
| `data.count` | unary | Đếm dòng (có tuỳ chọn ước lượng nhanh) |
| `data.applyChanges` | unary | Áp một batch insert/update/delete từ grid |
| `data.previewChanges` | unary | **Trả về SQL sẽ chạy, không chạy** |
| `data.fkLookup` | unary | Foreign Key Data Selection |

### `query.*`
`query.execute` (stream), `query.explain`, `query.format`, `query.parse`,
`query.cancel`, `query.history.list` / `.clear`

### `tx.*`
`tx.begin`, `tx.commit`, `tx.rollback`, `tx.status`

### `ddl.*`
| Method | Mô tả |
|---|---|
| `ddl.previewTable` | Nhận `TableDesign` → trả SQL, **không chạy** |
| `ddl.applyTable` | Chạy SQL đã xem trước (nhận `previewToken`) |
| `ddl.previewView` / `.applyView`, `.previewRoutine` / `.applyRoutine` | tương tự |
| `ddl.dropObject` | Xoá, luôn kèm preview trước |
| `ddl.maintain` | analyze / optimize / vacuum / reindex / repair |

> **Mẫu preview-token**: mọi thao tác phá huỷ đi theo cặp `preview*` → `apply*`.
> `preview*` trả về `{ sql, previewToken, warnings[] }`; `apply*` chỉ nhận `previewToken`
> còn hiệu lực 5 phút. UI **không thể** chạy DDL mà chưa hiển thị SQL cho người dùng.
> Xem [ADR-0010](adr/ADR-0010-preview-token.md).

### `job.*`
| Method | Kiểu | Mô tả |
|---|---|---|
| `job.start` | unary | Khởi tạo job dài (import/export/backup/restore/transfer/sync/datagen) |
| `job.list` / `.get` | unary | |
| `job.cancel` | unary | |
| `job.log` | stream | Log realtime |
| `job.artifacts` | unary | File sinh ra (đường dẫn hoặc download token) |

### `schedule.*`
`schedule.list`, `.create`, `.update`, `.delete`, `.runNow`, `.history`

### `security.*`
`security.users`, `.roles`, `.privileges`, `.previewGrant`, `.applyGrant`

### `monitor.*`
`monitor.processes` (stream), `.killProcess`, `.variables`, `.status`

### `workspace.*`
`workspace.queries.*`, `.snippets.*`, `.profiles.*`, `.favorites.*`, `.groups.*`,
`workspace.settings.get` / `.set`

### `file.*` — cầu nối file, khác nhau giữa 2 target
`file.pickOpen`, `file.pickSave`, `file.readChunk`, `file.writeChunk`, `file.stat`
Xem [ADR-0009](adr/ADR-0009-web-desktop-parity.md).

### `ai.*`
`ai.chat` (stream), `ai.generateSql`, `ai.fixSql`, `ai.explainPlan`

### Topic cho `subscribe`
| Topic | Nội dung |
|---|---|
| `job.progress` | `{ jobId, percent, phase, message }` |
| `connection.state` | Mất kết nối / kết nối lại |
| `schema.invalidated` | Sau DDL — UI đánh dấu cache bẩn |
| `notification` | Thông báo hệ thống |

---

## 5. Hiện thực transport

### 5.1 HTTP (web)

```
POST /rpc/:method          → unary.  Body = params (JSON). Response = result | CorvusError
GET  /ws                   → WebSocket đa kênh cho stream + subscribe
```

Khung tin trên WebSocket:

```ts
type Frame =
  | { t: 'open';   id: string; method: string; params: unknown }
  | { t: 'chunk';  id: string; seq: number; data: unknown }
  | { t: 'end';    id: string; stats?: unknown }
  | { t: 'error';  id: string; error: CorvusError }
  | { t: 'cancel'; id: string }
  | { t: 'sub';    id: string; topic: string }
  | { t: 'event';  topic: string; data: unknown }
  | { t: 'ping' } | { t: 'pong' }
```

Yêu cầu:
- **Backpressure**: client gửi `{ t:'ack', id, seq }` mỗi 4 chunk; server dừng đọc cursor khi
  có > 8 chunk chưa ack. Không có bước này, một `SELECT *` trên bảng 50 triệu dòng sẽ làm
  sập cả server lẫn tab trình duyệt.
- **Reconnect**: WebSocket đứt → client tự nối lại, khôi phục `subscribe`, đánh dấu các stream
  đang chạy là `interrupted` (không tự chạy lại query — nguy hiểm với DML).
- Nén `permessage-deflate` bật cho payload > 4 KB.

### 5.2 Electron IPC (desktop)

```ts
// preload.ts — bề mặt duy nhất được phơi ra renderer
contextBridge.exposeInMainWorld('corvus', {
  invoke: (method: string, params: unknown) => ipcRenderer.invoke('corvus:rpc', method, params),
  openStream: (method: string, params: unknown) => {
    const { port1, port2 } = new MessageChannel()
    ipcRenderer.postMessage('corvus:stream', { method, params }, [port2])
    return port1                       // renderer đọc chunk từ port1
  },
  subscribe: (topic: string) => { /* tương tự, 1 MessagePort / topic */ },
})
```

Bắt buộc:
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- **Không** phơi `ipcRenderer` thô ra renderer
- Main process validate `method` nằm trong `METHODS` trước khi dispatch

### 5.3 Mock (test & Storybook)

`transport-mock` đọc fixture từ `packages/transport-mock/src/fixtures` — chính là dữ liệu
mock `sakila` hiện có. Nhờ vậy Storybook và unit test UI chạy **không cần database**.

---

## 6. Bảng đối chiếu ba transport

| Khía cạnh | HTTP | IPC | Mock |
|---|---|---|---|
| Unary | `POST /rpc/:m` | `ipcRenderer.invoke` | gọi hàm trực tiếp |
| Stream | WebSocket frame | `MessagePort` | async generator |
| Subscribe | WebSocket topic | `MessagePort` | EventEmitter |
| Huỷ | frame `cancel` | `port.postMessage({cancel})` | `AbortSignal` |
| Backpressure | ack window | tự nhiên (port có hàng đợi) | không cần |
| Xác thực | cookie + CSRF token | không cần (cùng process) | không |
| Timeout mặc định | 30 s | 30 s | 0 |

---

## 7. Điều tuyệt đối cấm

| ❌ Cấm | ✅ Thay bằng |
|---|---|
| UI import `node:fs`, `electron`, `pg`, `mysql2` | Gọi RPC |
| `if (window.electron)` trong component | Inject `Transport` ở bootstrap |
| Thêm endpoint HTTP riêng ngoài `/rpc` và `/ws` | Thêm method vào contract |
| UI tự ghép chuỗi SQL rồi gửi `query.execute` cho thao tác có sẵn method riêng | Dùng `data.*` / `ddl.*` |
| Trả `any` từ handler | Khai báo result schema |
| Ném `Error` thô từ handler | Ném `CorvusError` |
