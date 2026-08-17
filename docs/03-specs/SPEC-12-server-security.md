# SPEC-12: Server Security (User / Role / Privilege)

- **Trạng thái**: Ready
- **Wave**: W-5
- **Tier**: T1 (user) / T2 (role, privilege)
- **Phụ thuộc**: SPEC-02, ADR-0010
- **Task**: T-380 … T-398

## 1. Mục tiêu

Người dùng quản lý tài khoản, vai trò và quyền **của máy chủ cơ sở dữ liệu** (khác với tài
khoản Corvus). Dialog Users đã có trong shell hiện tại.

## 2. Phạm vi

**Trong**: liệt kê user/role, User Designer, Role/Group Designer, Privilege Manager,
xem trước GRANT/REVOKE, đổi mật khẩu, khoá/mở tài khoản.
**Ngoài**: tài khoản Corvus và RBAC nội bộ → [security.md](../02-architecture/security.md).

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-12.01 | Liệt kê user với: tên, host (nếu có), vai trò, lần đăng nhập cuối, trạng thái | MUST |
| FR-12.02 | Chỉ hiện khi `caps.tools.userManagement` | MUST |
| FR-12.03 | Tạo user: tên, host, mật khẩu, plugin xác thực, tuỳ chọn hết hạn | MUST |
| FR-12.04 | Sửa user: đổi mật khẩu, đổi host, bật/tắt, đặt lại hết hạn | MUST |
| FR-12.05 | Xoá user MUST hiện DDL + yêu cầu gõ tên user để xác nhận | MUST |
| FR-12.06 | Mật khẩu mới MUST đi qua `SecretVault` nếu người dùng chọn lưu; KHÔNG lưu mặc định | MUST |
| FR-12.07 | Mật khẩu MUST KHÔNG bao giờ xuất hiện trong audit log hay log thường | MUST |
| FR-12.08 | Role Designer: tạo/xoá role, gán role cho user, role lồng nhau (nếu engine hỗ trợ) | SHOULD |
| FR-12.09 | Privilege Manager: ma trận (object × quyền) với checkbox, 3 trạng thái (có / không / thừa hưởng) | SHOULD |
| FR-12.10 | Quyền ở nhiều cấp: global / database / schema / table / column / routine | SHOULD |
| FR-12.11 | **Mọi** thay đổi quyền MUST hiện SQL GRANT/REVOKE trước khi chạy | MUST |
| FR-12.12 | Áp thay đổi MUST đi qua preview-token | MUST |
| FR-12.13 | Information Pane MUST có tab hiện quyền của user/role đang chọn (Member Of, Privileges) | SHOULD |
| FR-12.14 | Ở read-only, mọi thao tác ghi MUST bị chặn | MUST |
| FR-12.15 | Thao tác vào chính user đang kết nối MUST cảnh báo đặc biệt (có thể tự khoá mình ra ngoài) | MUST |
| FR-12.16 | Xoá/thu quyền của user hệ thống (`root`, `postgres`, `sa`) MUST cảnh báo mạnh | MUST |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `UsersDialog` | `packages/ui/src/dialogs/UsersDialog.tsx` | **đã có** — nối logic thật |
| `UserDesigner` | `…/security/UserDesigner.tsx` | mới |
| `RoleDesigner` | `…/security/RoleDesigner.tsx` | mới |
| `PrivilegeMatrix` | `…/security/PrivilegeMatrix.tsx` | mới |
| `SqlPreviewDialog` | dùng chung | |

`PrivilegeMatrix`: cây object bên trái, ma trận quyền bên phải, dùng `DataGrid` với cell là
checkbox 3 trạng thái. Ô "thừa hưởng" hiện khác biệt rõ (dấu chấm mờ) so với "được gán trực tiếp".

Trạng thái: empty (không có user nào — bất thường, hiện cảnh báo) · loading · ready · error
(thiếu quyền đọc catalog user → nêu rõ) · unsupported (SQLite → ẩn hoàn toàn).

## 5. Hợp đồng RPC

```ts
export const securityUsers = defineUnary({
  name: 'security.users',
  params: z.object({ connectionId: z.string().uuid() }),
  result: z.array(z.object({
    name: z.string(),
    host: z.string().optional(),
    roles: z.array(z.string()),
    lastLogin: z.string().nullable(),
    status: z.enum(['active', 'locked', 'expired']),
    isSystem: z.boolean(),
    isCurrent: z.boolean(),          // cho FR-12.15
    authPlugin: z.string().optional(),
  })),
  permission: 'security:read',
  audit: 'metadata',
})

export const securityPreviewGrant = defineUnary({
  name: 'security.previewGrant',
  params: z.object({
    connectionId: z.string().uuid(),
    changes: z.array(z.discriminatedUnion('op', [
      z.object({ op: z.literal('grant'),  grantee: Grantee, privilege: z.string(), target: PrivilegeTarget, withGrantOption: z.boolean().default(false) }),
      z.object({ op: z.literal('revoke'), grantee: Grantee, privilege: z.string(), target: PrivilegeTarget }),
    ])),
  }),
  result: z.object({
    statements: z.array(z.string()),
    previewToken: z.string(), expiresAt: z.string(),
    warnings: z.array(DdlWarning),    // gồm 'bạn đang thu quyền của chính mình'
  }),
  permission: 'security:write',
  audit: 'metadata',
  guard: 'writeGuard',
})
// security.applyGrant({ previewToken })

export const securityUserPreview = defineUnary({
  name: 'security.previewUser',
  params: z.object({
    connectionId: z.string().uuid(),
    op: z.enum(['create', 'alter', 'drop']),
    user: UserDesign,
    /** Mật khẩu KHÔNG đi vào statements dạng rõ — engine thay bằng placeholder khi trả về preview. */
    password: z.string().optional(),
  }),
  result: z.object({
    /** Mật khẩu đã được thay bằng '«password»' để hiển thị an toàn. */
    displayStatements: z.array(z.string()),
    previewToken: z.string(), expiresAt: z.string(),
    warnings: z.array(DdlWarning),
  }),
  permission: 'security:write',
  audit: 'metadata',
  guard: 'writeGuard',
})
```

> **Chi tiết quan trọng**: SQL hiển thị cho người dùng có mật khẩu bị che
> (`CREATE USER 'x'@'%' IDENTIFIED BY «password»`), nhưng SQL thật chạy có mật khẩu.
> Đây là ngoại lệ duy nhất của nguyên tắc "SQL hiển thị = SQL chạy" (ADR-0010), và phải được
> ghi rõ trong code kèm comment giải thích.

## 6. Logic engine

Mỗi driver hiện thực `SecurityProvider` (một `extension` của `DriverConnection`):

```ts
interface SecurityProvider {
  listUsers(): Promise<UserInfo[]>
  listRoles(): Promise<RoleInfo[]>
  listPrivileges(grantee: Grantee): Promise<PrivilegeGrant[]>
  /** Ma trận quyền khả dụng cho từng cấp object của engine này. */
  privilegeCatalog(): PrivilegeCatalog
}
```

Nguồn dữ liệu:

| Engine | Nguồn |
|---|---|
| MySQL | `mysql.user`, `mysql.db`, `mysql.tables_priv`, `information_schema.*_PRIVILEGES`, `SHOW GRANTS` |
| PostgreSQL | `pg_roles`, `pg_auth_members`, `information_schema.role_table_grants`, `aclexplode()` |
| MSSQL | `sys.server_principals`, `sys.database_principals`, `sys.database_permissions`, `fn_my_permissions` |
| Oracle | `dba_users`, `dba_roles`, `dba_role_privs`, `dba_tab_privs`, `dba_sys_privs` |
| MongoDB | `db.getUsers()`, `db.getRoles()` |
| Redis | `ACL LIST`, `ACL GETUSER` |
| SQLite | không có → `caps.tools.userManagement = false` |

## 7. Khác biệt theo engine

| Engine | Khác biệt lớn |
|---|---|
| MySQL | User là cặp `(name, host)`; role chỉ từ 8.0 |
| PostgreSQL | User và role là một (`pg_roles`); `LOGIN` phân biệt; quyền thừa hưởng qua membership |
| MSSQL | 2 cấp: server login ↔ database user; 4 loại role |
| Oracle | Schema ≡ user; quyền hệ thống rất nhiều |
| MongoDB | Role tích hợp + custom, theo database |
| Redis | ACL với pattern key và command category |

Sự khác biệt này **không** thể quy về một UI duy nhất hoàn hảo. Cách xử lý: `UserDesigner`
render form từ `privilegeCatalog()` và `driver.userDesignSchema` — cùng cơ chế như dialog
kết nối (SPEC-01 FR-01.02).

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Thiếu quyền đọc catalog user | `PERMISSION_DENIED` | "Tài khoản hiện tại không có quyền xem danh sách người dùng" |
| Thiếu quyền GRANT | `PERMISSION_DENIED` | Nêu rõ quyền cần (`WITH GRANT OPTION`) |
| Tự thu quyền của mình | — (cảnh báo) | Dialog cảnh báo mạnh: "Bạn có thể mất quyền truy cập" |
| Mật khẩu không đạt policy của server | `PASSWORD_POLICY` | Hiển thị thông điệp gốc từ server |
| User đã tồn tại | `DUPLICATE_OBJECT` | Validate ở client trước |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| `security.users` với 500 user | ≤ 500 ms |
| `security.privileges` cho 1 user, 2 000 bảng | ≤ 2 s |
| Render `PrivilegeMatrix` 2 000 hàng × 12 quyền | ảo hoá, ≥ 55 fps |

## 10. Bảo mật

**Module nhạy cảm nhất sau vault.**

- `security:read` / `security:write`.
- Mật khẩu: không lưu mặc định; nếu lưu thì vào vault; **không bao giờ** vào audit/log/preview
  hiển thị.
- Bắt buộc preview-token cho mọi thay đổi.
- Read-only chặn hoàn toàn.
- Audit `full` cho apply — ghi statement đã thay mật khẩu bằng placeholder.
- Cảnh báo bắt buộc khi tác động vào chính mình hoặc user hệ thống.
- Test `security-password-leak.test.ts`: tạo user với mật khẩu sentinel, quét mọi response,
  log, audit — không được xuất hiện.

## 11. i18n

`security.users`, `security.roles`, `security.privileges`, `security.newUser`,
`security.editUser`, `security.dropUser`, `security.changePassword`, `security.lockUser`,
`security.host`, `security.authPlugin`, `security.expiry`, `security.status.*` (3),
`security.memberOf`, `security.grantOption`, `security.inherited`,
`security.warnSelf`, `security.warnSystemUser`, `security.notSupported`,
`privilege.level.*` (6), `privilege.name.*` (~20)

## 12. Tiêu chí chấp nhận

```
[ ] FR-12.01–16 đều có test
[ ] Liệt kê user đúng trên 4 engine (integration)
[ ] Tạo → sửa → xoá user, round-trip đúng
[ ] Mật khẩu không rò — security-password-leak.test.ts
[ ] SQL hiển thị có mật khẩu bị che; SQL chạy có mật khẩu thật; có comment giải thích trong code
[ ] GRANT/REVOKE luôn qua preview-token
[ ] Cảnh báo khi thu quyền của chính mình hoặc user hệ thống
[ ] Ma trận quyền phân biệt được "gán trực tiếp" và "thừa hưởng"
[ ] Ẩn hoàn toàn với SQLite
[ ] Read-only chặn
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
