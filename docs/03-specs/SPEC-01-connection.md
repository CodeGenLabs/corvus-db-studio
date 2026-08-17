# SPEC-01: Quản lý kết nối

- **Trạng thái**: Ready
- **Wave**: W-0
- **Tier**: T0
- **Phụ thuộc**: ADR-0003, ADR-0006, [security.md](../02-architecture/security.md)
- **Task**: T-070 … T-082

---

## 1. Mục tiêu

Người dùng khai báo, kiểm tra, lưu và mở kết nối tới máy chủ cơ sở dữ liệu. Đây là cửa vào của
toàn bộ sản phẩm — không có nó thì không có gì khác chạy được.

## 2. Phạm vi

**Trong phạm vi**: CRUD profile, test kết nối, mở/đóng session, SSL, SSH tunnel, chế độ
read-only, tô màu, nhóm, URI, pool kết nối.

**Ngoài phạm vi**: duyệt object sau khi kết nối → SPEC-02. Xác thực người dùng Corvus →
[security.md](../02-architecture/security.md).

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-01.01 | Người dùng MUST tạo được profile kết nối cho mọi engine đã đăng ký trong driver registry | MUST |
| FR-01.02 | Dialog kết nối MUST hiển thị đúng bộ field của engine được chọn, lấy từ `driver.connectionSchema` | MUST |
| FR-01.03 | Người dùng MUST test được kết nối trước khi lưu; kết quả hiện version server và độ trễ | MUST |
| FR-01.04 | Mật khẩu MUST được lưu qua `SecretVault`, KHÔNG bao giờ nằm trong `workspace.db` dạng rõ | MUST |
| FR-01.05 | `connection.list` / `.get` MUST KHÔNG trả về mật khẩu; chỉ trả `hasPassword: boolean` | MUST |
| FR-01.06 | Người dùng MUST bật/tắt được chế độ read-only cho mỗi profile | MUST |
| FR-01.07 | Khi tên profile chứa `prod`/`production`/`live`, hệ thống SHOULD gợi ý bật read-only | SHOULD |
| FR-01.08 | Người dùng MUST cấu hình được SSL: mode, CA, client cert, client key | MUST |
| FR-01.09 | Người dùng MUST cấu hình được SSH tunnel: host, port, user, password hoặc private key + passphrase | MUST |
| FR-01.10 | Lần đầu gặp SSH host key, hệ thống MUST hỏi xác nhận fingerprint và lưu vào `known_hosts` | MUST |
| FR-01.11 | Khi SSH host key đổi so với `known_hosts`, hệ thống MUST từ chối kết nối và cảnh báo MITM | MUST |
| FR-01.12 | Người dùng MUST gán được màu cho profile; màu hiện ở nav pane, tab và status bar | MUST |
| FR-01.13 | Người dùng SHOULD nhóm được profile vào virtual group nhiều cấp | SHOULD |
| FR-01.14 | Người dùng SHOULD tạo được profile từ URI và xuất profile ra URI (URI KHÔNG chứa mật khẩu) | SHOULD |
| FR-01.15 | Người dùng MUST nhân bản được profile | MUST |
| FR-01.16 | Engine MUST giữ pool kết nối; kết nối rỗi quá `idleTimeout` (mặc định 10 phút) bị đóng | MUST |
| FR-01.17 | Khi kết nối rớt, engine MUST thử lại theo backoff mũ (1s, 2s, 4s, 8s, tối đa 30s) và phát `connection.state` | MUST |
| FR-01.18 | Ở bản web, host trong danh sách deny MUST bị từ chối với lý do rõ ràng | MUST |
| FR-01.19 | Ở bản web, khi người dùng nhập `localhost`, UI MUST cảnh báo host được phân giải từ máy chủ | MUST |
| FR-01.20 | Người dùng MAY đặt `Initial database`/`schema` mở sẵn khi kết nối | MAY |

## 4. Giao diện

### 4.1 Component

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `ConnectionDialog` | `packages/ui/src/dialogs/ConnectionDialog.tsx` | **đã có** — mở rộng từ bản tĩnh hiện tại |
| `ConnectionForm` | `packages/ui/src/dialogs/connection/ConnectionForm.tsx` | mới — render từ `connectionSchema` |
| `SslTab`, `SshTab`, `AdvancedTab` | `…/connection/` | mới |
| `TestConnectionResult` | `…/connection/` | mới |
| `HostKeyPrompt` | `…/connection/` | mới |
| `NavPane` | `packages/ui/src/panes/NavPane.tsx` | **đã có** — nối dữ liệu thật |

### 4.2 Hành vi

Dialog có 4 tab: **General · SSL · SSH · Advanced**. Danh sách engine bên trái (đã có trong UI
hiện tại). Chọn engine → form phải render lại theo `connectionSchema` của driver đó, **không
hard-code**.

Trạng thái bắt buộc:

| Trạng thái | Hiển thị |
|---|---|
| empty | Chưa có profile nào → nav pane hiện nút lớn "Tạo kết nối đầu tiên" |
| loading | Đang test → nút Test hiện spinner, các nút khác vô hiệu hoá |
| ready | Test thành công → banner xanh "Đã kết nối · MySQL 8.0.36 · 12 ms" |
| error | Banner đỏ, thông điệp đã i18n, nút "Chi tiết" mở lỗi gốc từ driver |
| unsupported | Engine chưa hỗ trợ → hiện trong danh sách kèm nhãn "Sắp có", không chọn được |

### 4.3 Phím tắt

| Phím | Hành động |
|---|---|
| `Ctrl+Shift+N` | Kết nối mới |
| `Ctrl+Enter` (trong dialog) | Test connection |
| `Enter` | Lưu |
| `Esc` | Đóng |
| `F5` (trên node cây) | Làm mới |

## 5. Hợp đồng RPC

```ts
// packages/contract/src/methods/connection.ts

export const connectionList = defineUnary({
  name: 'connection.list',
  params: z.object({ groupId: z.string().optional() }),
  result: z.array(ConnectionSummary),          // KHÔNG có trường password
  permission: 'connection:read',
  audit: 'metadata',
})

export const connectionCreate = defineUnary({
  name: 'connection.create',
  params: z.object({
    name: z.string().min(1).max(120),
    driverId: DriverId,
    config: z.record(z.unknown()),             // validate lại theo driver.connectionSchema
    secrets: z.object({
      password: z.string().optional(),
      sshPassword: z.string().optional(),
      sshPrivateKey: z.string().optional(),
      sshPassphrase: z.string().optional(),
      tlsKey: z.string().optional(),
    }).optional(),
    mode: z.enum(['read-write', 'read-only']).default('read-write'),
    color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    groupId: z.string().optional(),
  }),
  result: ConnectionSummary,
  permission: 'connection:write',
  audit: 'metadata',                            // 'metadata' — KHÔNG ghi secret vào audit
})

export const connectionTest = defineUnary({
  name: 'connection.test',
  params: z.object({
    /** Test profile đã lưu … */
    connectionId: z.string().uuid().optional(),
    /** … hoặc test cấu hình chưa lưu (dialog "Test" trước khi Save). */
    draft: z.object({ driverId: DriverId, config: z.record(z.unknown()), secrets: z.record(z.string()).optional() }).optional(),
  }),
  result: z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), serverVersion: z.string(), latencyMs: z.number(), capabilities: CapabilitySet }),
    z.object({ ok: z.literal(false), error: CorvusErrorSchema }),
  ]),
  permission: 'connection:read',
  audit: 'metadata',
})

export const connectionOpen = defineUnary({
  name: 'connection.open',
  params: z.object({ connectionId: z.string().uuid() }),
  result: z.object({
    sessionId: z.string(),
    serverVersion: z.string(),
    capabilities: CapabilitySet,               // ĐÃ thu hẹp theo server thật
    defaultDatabase: z.string().optional(),
  }),
  permission: 'connection:read',
  audit: 'metadata',
})
```

Còn lại: `connection.get`, `.update`, `.delete`, `.duplicate`, `.close`, `.status`,
`.parseUri`, `.toUri`, `.trustHostKey`.

## 6. Logic engine

### Mở kết nối

```
1. Nạp profile từ workspace.db
2. AuthContext.assertCan('connection:read', connectionId)
3. Kiểm tra host policy (chỉ web) → từ chối nếu bị deny
4. Nếu có SSH: TunnelManager.acquire(profile) → cổng local
     - kiểm host key với known_hosts
     - chưa biết → ném NEEDS_HOST_KEY_CONFIRMATION kèm fingerprint
     - khác → ném HOST_KEY_MISMATCH (KHÔNG cho bỏ qua)
5. SecretVault.get() lấy mật khẩu
6. driver.connect(resolvedProfile) → DriverConnection
7. Đọc server version, thu hẹp capabilities
8. Nếu mode = read-only → set session read-only ở tầng server nếu engine hỗ trợ
9. Đăng ký vào SessionManager, khởi động heartbeat
```

### Pool

- Mỗi profile: tối thiểu 0, tối đa 8 kết nối (cấu hình được).
- Session dành riêng cho transaction đang mở **không** trả về pool cho tới khi commit/rollback.
- Rỗi > `idleTimeout` → đóng. Còn 1 kết nối "mồi" nếu người dùng đang mở database.
- `ping()` mỗi 60 s trên kết nối rỗi để phát hiện rớt sớm.

### Tunnel

`TunnelManager` giữ tunnel theo `profileId`, đếm tham chiếu. Session cuối đóng → tunnel đóng
sau 30 s ân hạn (tránh mở/đóng liên tục).

## 7. Khác biệt theo engine

| Engine | Khác biệt | Xử lý |
|---|---|---|
| SQLite | Không host/port/user; chỉ đường dẫn file | `connectionSchema` chỉ có `file`; ở web dùng `FileGateway` (upload) hoặc đường dẫn trên server |
| Oracle | Service name vs SID vs TNS | 3 chế độ trong `connectionSchema` |
| MSSQL | 4 kiểu xác thực (SQL / Windows / Entra password / Entra integrated) | Windows/Integrated **chỉ khả dụng ở desktop**; web ẩn có tooltip |
| MongoDB | Nhận URI đầy đủ, replica set, `authSource` | Ưu tiên URI; form là bộ dựng URI |
| Redis | Không user ở < 6.0; sentinel; cluster | Field theo version, phát hiện sau khi connect |
| MySQL | `lower_case_table_names` ảnh hưởng case sensitivity | Đọc lúc connect, ghi vào capabilities |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Sai mật khẩu | `AUTH_FAILED` | "Sai tên đăng nhập hoặc mật khẩu" |
| Không tới được host | `CONNECTION_REFUSED` | "Không kết nối được tới {host}:{port}" + gợi ý kiểm tra firewall/SSH |
| Timeout | `CONNECTION_TIMEOUT` | "Hết thời gian chờ sau {n}s" |
| TLS thất bại | `TLS_ERROR` | "Không thiết lập được kênh mã hoá" + chi tiết |
| Host key chưa biết | `NEEDS_HOST_KEY_CONFIRMATION` | Dialog hiện fingerprint, nút Tin / Huỷ |
| Host key đổi | `HOST_KEY_MISMATCH` | Cảnh báo đỏ, **không có nút bỏ qua** |
| Host bị chặn (web) | `HOST_NOT_ALLOWED` | "Máy chủ Corvus không được phép kết nối tới host này" |
| Hết kết nối ở server | `TOO_MANY_CONNECTIONS` | "Máy chủ đã đạt giới hạn kết nối" |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Test connection tới DB local | ≤ 500 ms |
| Mở connection có SSH tunnel | ≤ 3 s |
| `connection.list` với 200 profile | ≤ 50 ms |
| Lấy kết nối từ pool (đã ấm) | ≤ 5 ms |

## 10. Bảo mật

- Quyền: `connection:read` để xem/mở, `connection:write` để sửa.
- Secret không bao giờ đi qua RPC result. `audit: 'metadata'` để tránh ghi secret.
- Bắt buộc kiểm host key SSH — không có tuỳ chọn tắt.
- Ở web, host policy được áp **trước** khi mở socket.
- Test `connection-secret-leak.test.ts`: tạo profile với mật khẩu sentinel, gọi mọi method
  `connection.*`, khẳng định sentinel không xuất hiện trong bất kỳ response, log, hay audit nào.

## 11. i18n

`connection.new`, `connection.test`, `connection.testing`, `connection.testOk`,
`connection.testFailed`, `connection.readOnly`, `connection.readOnlyHint`,
`connection.sslMode.*`, `connection.ssh.*`, `connection.hostKey.title`,
`connection.hostKey.trust`, `connection.hostKey.mismatch`, `connection.localhostWarning`,
`connection.color`, `connection.duplicate`, `error.connection.*` (8 khoá)

## 12. Tiêu chí chấp nhận

```
[ ] FR-01.01–20 đều có test
[ ] Tạo/sửa/xoá/nhân bản profile — e2e/connection.spec.ts
[ ] Test connection thành công và thất bại — integration, 3 engine
[ ] Mật khẩu không rò — connection-secret-leak.test.ts
[ ] SSH tunnel: kết nối được, host key mới → hỏi, host key đổi → chặn
[ ] Read-only: chặn DML/DDL ở cả tầng SQL parse lẫn tầng session
[ ] Pool: 200 lần open/close không rò socket (C9 conformance)
[ ] Rớt kết nối → backoff, phát connection.state, UI hiện banner
[ ] Web: localhost cảnh báo; host bị deny → HOST_NOT_ALLOWED
[ ] 5 trạng thái UI đều có
[ ] i18n vi/en/ja đủ
```
