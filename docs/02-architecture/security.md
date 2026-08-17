# Mô hình bảo mật

> Corvus giữ **thông tin đăng nhập vào cơ sở dữ liệu production**. Đây là tài sản nhạy cảm nhất
> trong toàn hệ thống. Mọi quyết định trong tài liệu này là **bắt buộc**, không phải khuyến nghị.

---

## 1. Mô hình đe doạ

| ID | Kẻ tấn công | Kịch bản | Biện pháp |
|---|---|---|---|
| TM-1 | Người dùng khác trên cùng máy (desktop) | Đọc file profile để lấy mật khẩu DB | Secret trong Windows Credential Manager, DPAPI theo user |
| TM-2 | Kẻ chiếm được máy chủ web | Đọc DB workspace để lấy toàn bộ mật khẩu DB của mọi user | Mã hoá envelope, master key ngoài DB (KMS/env), per-user KEK |
| TM-3 | Người dùng Corvus có tài khoản hợp lệ | Truy cập connection của người khác | RBAC + kiểm tra quyền ở **engine**, không ở UI |
| TM-4 | XSS trong UI | Đánh cắp session, gọi RPC thay người dùng | CSP nghiêm, không `dangerouslySetInnerHTML`, cookie `HttpOnly`+`SameSite=Strict`, CSRF token |
| TM-5 | Renderer bị chiếm (desktop) | Thoát sandbox, chạy code Node | `contextIsolation`+`sandbox`, preload phơi đúng 1 API, validate method ở main |
| TM-6 | SQL injection qua tên object | Bảng tên `users"; DROP TABLE x; --` | Bắt buộc dùng `dialect.quoteIdentifier`, cấm ghép chuỗi |
| TM-7 | Rò rỉ qua log / telemetry / AI | Mật khẩu vào file log hoặc gửi lên AI provider | Middleware redaction, allowlist trường gửi cho AI |
| TM-8 | Người dùng vô ý | `DELETE` không `WHERE` trên production | Read-only mode, preview-token, cảnh báo destructive |
| TM-9 | SSRF qua profile kết nối (web) | Người dùng tạo connection tới `169.254.169.254` | Allowlist/denylist host cấu hình được cho deployment web |

---

## 2. Quản lý bí mật (`SecretVault`)

```ts
export interface SecretVault {
  set(ref: SecretRef, value: string): Promise<void>
  get(ref: SecretRef): Promise<string | undefined>
  delete(ref: SecretRef): Promise<void>
  /** Bí mật KHÔNG BAO GIỜ được liệt kê hàng loạt. */
}
export type SecretRef = { kind: 'db-password' | 'ssh-key' | 'ssh-passphrase' | 'tls-key' | 'ai-api-key'; ownerId: string; connectionId: string }
```

Hai hiện thực:

### Desktop — `OsKeychainVault`
- Windows: `safeStorage` của Electron (DPAPI) ghi ciphertext vào `secrets.dat` cạnh workspace.
- Không dùng `keytar` (đã ngừng bảo trì, cần native build).

### Web — `EnvelopeVault`
```
master key (MK)      ← biến môi trường CORVUS_MASTER_KEY hoặc KMS, KHÔNG nằm trong DB
      │ HKDF(MK, userId)
      ▼
per-user KEK
      │ AES-256-GCM
      ▼
ciphertext bí mật    → lưu trong bảng `secret` của workspace.db
```
- Mất MK = mất toàn bộ secret (đúng như mong đợi). Tài liệu vận hành phải nói rõ.
- Đổi MK: có lệnh `corvus vault rotate --old … --new …`.

### Bất biến của vault
1. Secret **chỉ** rời vault để đi vào driver. Không đi qua bất kỳ RPC result nào.
2. `connection.get` trả về `hasPassword: boolean`, **không bao giờ** trả mật khẩu.
3. Không log secret ở bất kỳ mức nào, kể cả `debug`.
4. Không đưa secret vào error message, stack trace, telemetry, crash report.
5. Test `vault-leak.test.ts` quét toàn bộ output của log + RPC snapshot tìm giá trị sentinel.

---

## 3. Redaction

```ts
// packages/engine/src/redact.ts
const SECRET_KEYS = /^(password|passwd|pwd|secret|token|apiKey|privateKey|passphrase|authorization|cookie)$/i

export function redact<T>(value: T): T   // thay giá trị bằng '«redacted»', đệ quy, giữ cấu trúc
```

Áp dụng **bắt buộc** ở 4 chỗ: logger, audit log, telemetry, payload gửi cho AI provider.

---

## 4. Xác thực & phân quyền

### Desktop — `SingleUserAuth`
Không đăng nhập. `AuthContext` trả về một actor cố định có toàn quyền.
Bảo vệ ở tầng OS user account.

### Web — `MultiUserAuth`
- Local account (argon2id) hoặc OIDC (Keycloak/Entra/Google) — cấu hình được.
- Session: cookie `HttpOnly; Secure; SameSite=Strict`, xoay theo 8 giờ.
- Bắt buộc CSRF token cho mọi `POST /rpc/*`.

### RBAC

```ts
type Role = 'owner' | 'admin' | 'editor' | 'analyst' | 'viewer'

const PERMISSIONS: Record<Role, Permission[]> = {
  owner:   ['*'],
  admin:   ['connection:*', 'query:*', 'data:*', 'ddl:*', 'job:*', 'security:*', 'user:manage'],
  editor:  ['connection:read', 'query:execute', 'data:*', 'ddl:*', 'job:run'],
  analyst: ['connection:read', 'query:execute', 'data:read', 'job:run:export'],
  viewer:  ['connection:read', 'query:execute:readonly', 'data:read'],
}
```

Ngoài role toàn cục còn có **ACL theo connection**: mỗi connection có danh sách
`(userId | groupId) → accessLevel`.

**Bất biến**: kiểm tra quyền xảy ra trong `engine/router.ts` **trước khi** gọi handler.
UI ẩn nút chỉ là trải nghiệm, không phải bảo mật. Mọi handler đều đi qua cùng một cổng.

---

## 5. Chế độ read-only

Một tính năng an toàn quan trọng, **không có trong Navicat**.

`ConnectionProfile.mode: 'read-write' | 'read-only'`

Khi `read-only`:
1. Engine phân tích SQL bằng `@corvus/sql/parse`; chặn mọi statement không phải
   `SELECT`/`SHOW`/`EXPLAIN`/`DESCRIBE`/`WITH…SELECT`.
2. Nếu driver hỗ trợ, đặt luôn ở tầng session (`SET TRANSACTION READ ONLY`,
   `SET SESSION TRANSACTION READ ONLY`) — phòng thủ nhiều lớp.
3. UI hiển thị badge đỏ trên connection và vô hiệu hoá mọi nút ghi.
4. `data.applyChanges`, `ddl.*` bị từ chối ở router với `PERMISSION_DENIED`.

Khuyến nghị mặc định: connection có tên chứa `prod`/`production` → gợi ý bật read-only khi tạo.

---

## 6. Bảo vệ thao tác phá huỷ

| Cơ chế | Áp dụng cho |
|---|---|
| **Preview-token** (bắt buộc) | Mọi DDL, GRANT/REVOKE, `data.applyChanges` |
| Cảnh báo "không có WHERE" | `DELETE`/`UPDATE` chạy từ SQL Editor |
| Xác nhận gõ tên object | `DROP DATABASE`, `DROP TABLE`, `TRUNCATE` |
| Ước lượng số dòng ảnh hưởng | Hiển thị trước khi chạy DML từ grid |
| Bắt buộc backup trước | `restore`, `structure sync` vào connection read-write |

Luồng preview-token:

```
UI → ddl.previewTable(design)
     ← { sql: [...], previewToken: 'pt_...', warnings: [...], expiresAt }
UI hiển thị SQL + cảnh báo, người dùng bấm "Chạy"
UI → ddl.applyTable({ previewToken: 'pt_...' })
     engine kiểm: token còn hạn (5 phút), thuộc đúng actor,
                  schema chưa đổi kể từ lúc preview (so hash)
     ← kết quả
```

Nếu schema đã thay đổi giữa preview và apply → từ chối với `STALE_PREVIEW`, buộc xem lại.
Xem [ADR-0010](adr/ADR-0010-preview-token.md).

---

## 7. Chống SQL injection

Ba luật, được ép bằng ESLint rule tuỳ biến:

1. **Giá trị luôn dùng parameter binding.** Cấm nội suy giá trị vào chuỗi SQL.
2. **Identifier luôn qua `dialect.quoteIdentifier()`.** Không có ngoại lệ.
3. **Chỉ được ghép chuỗi SQL bằng template `sql\`\``** của `@corvus/sql`, tự động phân biệt
   giá trị (→ param) và identifier (→ quote).

```ts
// ✅ ĐÚNG
const stmt = sql`SELECT * FROM ${ident(schema)}.${ident(table)} WHERE ${ident(col)} = ${value}`
// → { text: 'SELECT * FROM "public"."users" WHERE "id" = $1', values: [value] }

// ❌ SAI — ESLint: corvus/no-raw-sql-concat
const stmt = `SELECT * FROM ${schema}.${table} WHERE ${col} = '${value}'`
```

SQL người dùng tự gõ trong SQL Editor **được phép chạy nguyên văn** — đó là chức năng.
Nhưng SQL do *hệ thống sinh* thì không bao giờ được ghép chuỗi thủ công.

---

## 8. Kênh mạng

### SSH tunnel
`ssh2`, hỗ trợ password / private key (RSA, ECDSA, Ed25519) / passphrase / agent.
- Tunnel là tài nguyên chia sẻ theo profile, đếm tham chiếu, đóng khi hết session.
- **Bắt buộc** kiểm host key. Lần đầu → hỏi người dùng xác nhận fingerprint, lưu vào
  `known_hosts` của workspace. Fingerprint đổi → **từ chối kết nối**, cảnh báo MITM.

### TLS tới database
Chế độ: `disable` / `prefer` / `require` / `verify-ca` / `verify-full`.
- Mặc định cho connection mới: `require`.
- `verify-full` cần CA cert → cho phép nạp từ file hoặc dán nội dung.
- **Cảnh báo rõ** khi người dùng chọn `disable` hoặc `require` mà không verify.

### HTTPS cho web deployment
- HSTS, TLS 1.2+.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss:; img-src 'self' data:; frame-ancestors 'none'`
- Không CDN bên ngoài — font đóng gói cùng bundle (khác với UI shell hiện tại đang nạp
  Google Fonts; phải sửa ở `T-011`).

### Chống SSRF (chỉ web)
Deployment web cấu hình `CORVUS_HOST_POLICY`:
```yaml
allow: ['10.0.0.0/8', 'db.internal']
deny:  ['169.254.0.0/16', '127.0.0.0/8', '::1']
```
Mặc định deny link-local và loopback, có thể mở tường minh.

---

## 9. Audit log

Ghi vào bảng riêng, chỉ thêm không sửa, xoay vòng theo dung lượng.

```ts
interface AuditEntry {
  id: string; ts: string
  actorId: string; actorName: string
  action: MethodName
  connectionId?: string; target?: string      // 'public.users'
  outcome: 'ok' | 'denied' | 'error'
  durationMs: number
  /** 'full' = lưu SQL; 'metadata' = chỉ tên method; 'none' = không ghi. */
  level: AuditLevel
  sql?: string                                 // đã redact
  rowsAffected?: number
  clientIp?: string; userAgent?: string
}
```

Mức audit khai báo ngay trong contract của method. Mặc định:
- `ddl.*`, `security.*`, `data.applyChanges`, `job.start` → `full`
- `query.execute` → `full` ở web, `metadata` ở desktop (cấu hình được)
- `introspect.*`, `connection.list` → `metadata`

---

## 10. Ranh giới AI

Bắt buộc, vì đây là đường rò dữ liệu dễ nhất:

| Loại dữ liệu | Được gửi cho AI provider |
|---|---|
| Tên bảng, tên cột, kiểu dữ liệu, comment | ✅ nếu người dùng bật `aiSchemaAccess` |
| DDL của object | ✅ nếu bật |
| SQL người dùng đang soạn | ✅ |
| Execution plan | ✅ |
| **Giá trị dữ liệu dòng** | ❌ **không bao giờ**, kể cả khi người dùng yêu cầu |
| Thông tin kết nối, host, user, mật khẩu | ❌ **không bao giờ** |

Thực thi: `packages/services/src/ai/sanitize.ts` xây payload theo **allowlist trường**, không
phải denylist. Có unit test khẳng định không có giá trị dòng nào lọt qua.

Người dùng phải bật AI tường minh; mặc định **tắt**. Khoá API lưu trong vault.

---

## 11. Checklist bảo mật cho mọi PR

```
[ ] Không thêm secret vào log / error / telemetry
[ ] Mọi SQL sinh tự động dùng sql`` template hoặc quoteIdentifier
[ ] Method mới có khai báo `permission` và `audit` trong contract
[ ] Thao tác phá huỷ đi qua preview-token
[ ] Không thêm `dangerouslySetInnerHTML`
[ ] Không thêm domain ngoài vào CSP
[ ] Không phơi thêm API nào ra `window` trong preload
[ ] Đã kiểm tra hành vi ở chế độ read-only
```
