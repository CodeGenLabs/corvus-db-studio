# Coding Rules

Luật code bắt buộc. Cột **Ép** cho biết luật được kiểm tự động hay chỉ qua review.

Ký hiệu: 🤖 ESLint/TS ép · 🔍 review ép · 🧪 test ép

---

## 1. Ranh giới tầng

| # | Luật | Ép |
|---|---|---|
| 1.1 | `packages/ui`, `packages/client`, `packages/contract` **không được** import `node:*`, `electron`, `pg`, `mysql2`, hay bất kỳ `driver-*` | 🤖 `no-node-in-ui` + dependency-cruiser |
| 1.2 | `packages/contract` là **lá** — không import package nội bộ nào khác | 🤖 dependency-cruiser |
| 1.3 | `driver-*` không import `services` hay `engine` | 🤖 dependency-cruiser |
| 1.4 | `electron` chỉ được import trong `apps/desktop/**` | 🤖 dependency-cruiser |
| 1.5 | UI giao tiếp với engine **chỉ** qua `Transport` — không có fetch/axios trực tiếp | 🔍 |

```ts
// ❌ packages/ui/src/views/DataView.tsx
import { readFileSync } from 'node:fs'
const rows = await fetch('/api/rows').then(r => r.json())

// ✅
const { data } = useQuery({
  queryKey: ['connection', id, 'table', ref, 'rows'],
  queryFn: () => client.request('data.browse', { connectionId: id, ref }),
})
```

---

## 2. TypeScript

| # | Luật | Ép |
|---|---|---|
| 2.1 | `strict: true`, `noUncheckedIndexedAccess: true` toàn repo | 🤖 |
| 2.2 | Không `any`. Dùng `unknown` rồi thu hẹp | 🤖 `no-explicit-any` |
| 2.3 | Không `as` để làm im lặng lỗi type. Chỉ dùng `as` khi có comment giải thích | 🔍 |
| 2.4 | Không `!` (non-null assertion) trừ khi có comment chứng minh không null | 🤖 warn + 🔍 |
| 2.5 | Không `@ts-expect-error` / `@ts-ignore` không có comment + mã task | 🤖 |
| 2.6 | Export public API có kiểu trả về tường minh (không dựa vào suy luận) | 🔍 |
| 2.7 | Kiểu dùng chung ở `contract/models`, không khai báo lại | 🔍 |
| 2.8 | Dùng `type` cho union/mapped, `interface` cho object có thể mở rộng | 🔍 |
| 2.9 | Không `enum` của TypeScript. Dùng union literal hoặc `as const` | 🤖 `no-restricted-syntax` |

```ts
// ❌
const cfg = json as Config

// ✅
const parsed = ConfigSchema.safeParse(json)
if (!parsed.success) throw corvusError('INVALID_CONFIG', parsed.error)
const cfg = parsed.data
```

---

## 3. SQL — luật quan trọng nhất về bảo mật

| # | Luật | Ép |
|---|---|---|
| 3.1 | SQL do **hệ thống sinh** không được ghép chuỗi. Dùng `` sql`` `` của `@corvus/sql` | 🤖 `no-raw-sql-concat` |
| 3.2 | Identifier luôn qua `dialect.quoteIdentifier()` hoặc `ident()` | 🤖 + 🧪 `identifier-injection.test.ts` |
| 3.3 | Giá trị luôn bind qua parameter, không nội suy | 🤖 + 🧪 |
| 3.4 | SQL người dùng tự gõ (SQL Editor) được chạy nguyên văn — đó là chức năng | — |
| 3.5 | `{ t: 'raw' }` trong `FilterExpr` chỉ nhận từ input người dùng tường minh, và phải cảnh báo | 🔍 |
| 3.6 | Driver không được `SELECT` rồi trả cả mảng. Luôn cursor + `AsyncIterable` | 🔍 + 🧪 bench RAM |
| 3.7 | `multipleStatements` (MySQL) chỉ bật cho session SQL Editor | 🔍 |
| 3.8 | **Dữ liệu giả chỉ được tồn tại trong `packages/transport-mock`.** Cấm hard-code dữ liệu mẫu trong `driver-*`, `services`, `engine` — driver chưa làm thì ném `NOT_IMPLEMENTED`, không trả dữ liệu giả | 🔍 |

```ts
// ❌ CẤM — dù `table` trông như đến từ nguồn tin cậy
const sql = `SELECT * FROM ${schema}.${table} WHERE ${col} = '${value}'`

// ✅
import { sql, ident } from '@corvus/sql'
const stmt = sql`SELECT * FROM ${ident(schema)}.${ident(table)} WHERE ${ident(col)} = ${value}`
// → { text: 'SELECT * FROM "public"."users" WHERE "email" = $1', values: [value] }
```

---

## 4. Capability, không phải driverId

| # | Luật | Ép |
|---|---|---|
| 4.1 | Không so sánh `driverId === '…'` trong `ui` hoặc `services` | 🤖 `no-driver-id-branching` |
| 4.2 | Rẽ nhánh theo `connection.capabilities`, và là capability của **connection**, không phải driver | 🔍 |
| 4.3 | Thêm cờ capability mới → cập nhật `capability-matrix.md` **và tất cả** driver cùng PR | 🔍 |
| 4.4 | Tính năng không hỗ trợ → ẩn hoặc vô hiệu hoá kèm tooltip. Không để người dùng bấm rồi gặp lỗi | 🔍 |

```tsx
// ❌
{conn.driverId === 'postgres' && <MaterializedViewFolder />}

// ✅
{caps.objects.materializedView && <MaterializedViewFolder />}

// ✅ vô hiệu hoá có giải thích
<Button
  disabled={!caps.exec.explainAnalyze}
  title={caps.exec.explainAnalyze ? undefined : t('error.notSupportedByEngine')}
/>
```

---

## 5. Thao tác phá huỷ

| # | Luật | Ép |
|---|---|---|
| 5.1 | Mọi `ddl.*`, `security.applyGrant`, `data.applyChanges`, job mutating đi qua `preview*` → `apply*` | 🧪 `preview-bypass.test.ts` + 🤖 contract check |
| 5.2 | `apply*` chỉ nhận `previewToken`, **không** nhận lại dữ liệu gốc | 🤖 contract check |
| 5.3 | SQL hiển thị = SQL chạy. Ngoại lệ duy nhất: che mật khẩu (SPEC-12 §5), phải có comment | 🔍 |
| 5.4 | `DROP DATABASE`/`DROP TABLE`/`TRUNCATE`/`FLUSHDB` yêu cầu gõ đúng tên object | 🔍 + 🧪 e2e |
| 5.5 | Read-only phải chặn ở engine, không chỉ ẩn nút ở UI | 🧪 `readonly-bypass.test.ts` |

---

## 6. Bí mật và log

| # | Luật | Ép |
|---|---|---|
| 6.1 | Secret chỉ rời `SecretVault` để vào driver. Không đi qua RPC result nào | 🧪 4 test rò rỉ |
| 6.2 | Logger, audit, telemetry, payload AI **phải** đi qua `redact()` | 🔍 + 🧪 |
| 6.3 | Không `console.log` trong code sản phẩm. Dùng logger có cấu trúc | 🤖 `no-console` |
| 6.4 | Error message hiển thị cho người dùng phải qua i18n, không phải chuỗi thô từ driver | 🔍 |
| 6.5 | `detail` (thông điệp gốc từ driver) chỉ hiện khi người dùng bấm "Chi tiết" | 🔍 |
| 6.6 | Payload AI xây theo **allowlist** trường, không denylist | 🔍 + 🧪 `ai-payload-leak.test.ts` |

---

## 7. Lỗi

| # | Luật | Ép |
|---|---|---|
| 7.1 | Handler ném `CorvusError`, không ném `Error` thô | 🔍 |
| 7.2 | Driver ánh xạ lỗi native → `ErrorCode`, ≥ 20 mã phổ biến | 🧪 C8 conformance |
| 7.3 | Mã lỗi mới → thêm vào `ErrorCode` union + khoá i18n `error.*` | 🤖 typecheck + 🧪 i18n check |
| 7.4 | Không `catch {}` rỗng. Nếu cố ý bỏ qua thì comment lý do | 🤖 |
| 7.5 | Không catch rồi ném lại mất `cause` | 🔍 |
| 7.6 | Lỗi có vị trí (`line`/`column`) phải giữ để UI highlight được | 🔍 |

```ts
// ❌
try { await run() } catch { /* nothing */ }

// ✅
try {
  await run()
} catch (e) {
  // Cache đọc lỗi không phải lỗi người dùng — bỏ cache và đọc lại từ server.
  logger.debug({ err: e }, 'metadata cache read failed, falling back to server')
  await cache.delete(key)
  return readFromServer()
}
```

---

## 8. Bất đồng bộ và tài nguyên

| # | Luật | Ép |
|---|---|---|
| 8.1 | Mọi thao tác dài phải nhận `AbortSignal` và tôn trọng nó | 🔍 |
| 8.2 | Huỷ phải dọn dẹp: đóng cursor, rollback tx, xoá file tạm, trả kết nối về pool | 🔍 + 🧪 |
| 8.3 | Không `await` trong vòng lặp khi có thể chạy song song — nhưng **có** giới hạn đồng thời | 🔍 |
| 8.4 | Job dài chạy trong worker thread, không trong event loop chính | 🔍 |
| 8.5 | Mọi `setInterval`/`setTimeout`/listener phải được dọn (cleanup / `finally`) | 🤖 `react-hooks/exhaustive-deps` + 🔍 |
| 8.6 | Không `sleep` để "đợi cho chắc" | 🤖 `no-restricted-syntax` trong test |

---

## 9. React & UI

Xem thêm [ui-rules.md](ui-rules.md).

| # | Luật | Ép |
|---|---|---|
| 9.1 | Component là function + hook. Không class component | 🤖 |
| 9.2 | Shell state → `useShellStore` (zustand). Server state → TanStack Query. Không trộn | 🔍 |
| 9.3 | Quy tắc phân loại: *"nếu người dùng khác cũng thấy được thì đó là server state"* | 🔍 |
| 9.4 | Query key theo quy ước ở ADR-0007 | 🔍 |
| 9.5 | Không `dangerouslySetInnerHTML` | 🤖 |
| 9.6 | Không fetch trong `useEffect`. Dùng react-query | 🔍 |
| 9.7 | View nặng phải `React.lazy` (ModelView, BiView, PipelineBuilder, ExplainTree) | 🧪 bundle size check |
| 9.8 | Component có tương tác phải có `data-testid` | 🔍 |
| 9.9 | Mọi chuỗi hiển thị qua `t()`. Không hard-code, kể cả "OK" | 🤖 `no-literal-string` (chỉ trong `views/` và `dialogs/`) |
| 9.10 | Mọi màn hình phải xử lý đủ 5 trạng thái: empty · loading · ready · error · unsupported | 🔍 |

---

## 10. Test

| # | Luật | Ép |
|---|---|---|
| 10.1 | Test cùng PR với code. Không "sẽ thêm sau" | 🔍 |
| 10.2 | Tên test mô tả hành vi: `'rejects DML on read-only connection'`, không `'test 1'` | 🔍 |
| 10.3 | Không `test.skip` không có comment + mã task | 🤖 |
| 10.4 | Không `sleep`. Đợi điều kiện cụ thể | 🤖 |
| 10.5 | Test độc lập, chạy song song được, tự dọn dữ liệu | 🔍 |
| 10.6 | Golden file thay đổi phải giải thích trong PR | 🔍 |
| 10.7 | Selector E2E dùng `data-testid`, không dùng text (vì i18n) hay class | 🤖 |
| 10.8 | Ngưỡng phủ theo package không được giảm | 🤖 CI |

---

## 11. Đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File component React | `PascalCase.tsx` | `DataGrid.tsx` |
| File khác | `camelCase.ts` | `splitStatements.ts`, `buildSelect.ts` |
| File test | `<name>.test.ts` / `.integration.test.ts` / `.bench.ts` | |
| Component, kiểu, interface | `PascalCase` | `TableMeta`, `ConnectionForm` |
| Hàm, biến | `camelCase` | `quoteIdentifier` |
| Hằng module | `SCREAMING_SNAKE` | `DEFAULT_CONFIG`, `PG_ERROR_MAP` |
| Hook | `use…` | `useQueryStream` |
| Method RPC | `namespace.verb` | `data.applyChanges`, `ddl.previewTable` |
| Method preview/apply | `previewX` / `applyX` | bắt buộc theo cặp |
| Cờ boolean | `is…` / `has…` / `can…` / `should…` | `hasPassword`, `canEdit` |
| Khoá i18n | `namespace.key` | `grid.setNull`, `error.connection.refused` |
| Cờ capability | `nhóm.tênCamel` | `objects.materializedView`, `exec.explainAnalyze` |
| Mã lỗi | `SCREAMING_SNAKE` | `HOST_KEY_MISMATCH`, `STALE_PREVIEW` |
| Branch git | `<type>/T-nnn-<slug>` | `feat/T-030-datagrid-virtualization` |

---

## 12. Import

Thứ tự (ESLint tự sắp xếp):

```ts
// 1. Node builtin (chỉ trong package Node)
import { createReadStream } from 'node:fs'
// 2. Dependency ngoài
import { z } from 'zod'
// 3. Package nội bộ @corvus/*
import { sql, ident } from '@corvus/sql'
// 4. Tương đối trong cùng package
import { mapError } from './errors'
// 5. Chỉ kiểu, dùng `import type`
import type { TableMeta } from '@corvus/contract'
```

| # | Luật | Ép |
|---|---|---|
| 12.1 | `import type` cho import chỉ dùng kiểu | 🤖 `consistent-type-imports` |
| 12.2 | Không import vòng | 🤖 `import/no-cycle` |
| 12.3 | Không deep import vào nội bộ package khác (`@corvus/ui/src/…`) | 🤖 |
| 12.4 | Không `export *` từ barrel file — export tường minh | 🔍 |

---

## 13. Hiệu năng

| # | Luật | Ép |
|---|---|---|
| 13.1 | Không nạp toàn bộ result set vào RAM ở bất kỳ tầng nào | 🧪 bench RAM |
| 13.2 | Introspection dùng truy vấn gộp, không N+1 | 🧪 test đếm query |
| 13.3 | Danh sách > 200 phần tử phải ảo hoá | 🔍 |
| 13.4 | Thao tác > 50 ms trong UI phải chuyển sang Web Worker (copy TSV, parse lớn) | 🔍 |
| 13.5 | Không tạo object/hàm mới trong render path nóng (grid cell) | 🔍 |
| 13.6 | Benchmark trong CI không được tụt > 15% so với baseline | 🤖 CI |

---

## 14. Phụ thuộc mới

Thêm dependency cần trả lời được **tất cả** câu sau, ghi trong PR:

```
[ ] Tại sao không dùng được thư viện đã có trong repo?
[ ] Kích thước bundle tăng bao nhiêu? (với dep của ui)
[ ] Có phải native module không? Nếu có → cần ADR
[ ] Giấy phép là gì? (cấm: GPL, AGPL, SSPL cho code sản phẩm)
[ ] Lần cập nhật gần nhất? Số issue mở? Có bảo trì không?
[ ] Nếu nó bị bỏ rơi thì ta thay bằng gì?
```

Native module mới **luôn** cần ADR — nó ảnh hưởng cả 3 target đóng gói.

---

## 15. Những chỗ dễ sai trong repo này

Danh sách này rút từ bản chất bài toán. Đọc trước khi làm việc ở vùng tương ứng.

| Vùng | Cái dễ sai | Cách tránh |
|---|---|---|
| `splitStatements` | `;` trong chuỗi, comment, dollar-quote, `DELIMITER` | Golden file 60 case/dialect |
| `alterTable` diff | Đổi tên cột bị hiểu thành drop+add | Ghép theo `id`, không theo tên |
| Chuẩn hoá giá trị | `BIGINT` mất chính xác; `DATE` sai timezone | `CellValue` với `k:'big'` là string |
| NULL vs `''` | Trộn lẫn hai thứ | `CellValue` phân biệt; UI render khác nhau |
| MongoDB | `missing` vs `null` | Phân biệt như NULL vs `''` |
| Streaming | Buffer cả result set | Cursor + ring buffer + ack window |
| Huỷ | Huỷ ở client nhưng server vẫn chạy | Gửi CANCEL tới server, kiểm bằng test |
| Transaction | Kết nối bị trả về pool khi tx còn mở | Session dành riêng cho tx |
| Read-only | Chặn ở UI nhưng không chặn ở engine | Kiểm ở router, test bypass |
| Preview-token | Sinh SQL lại lúc apply → khác SQL đã hiện | `apply*` chỉ nhận token |
| i18n | Thêm chuỗi mà quên tiếng Nhật | CI ép khoá đủ |
| Capability | Dùng capability của driver thay vì của connection | Luôn đọc từ `connection.capabilities` |
| Quoting | Tên bảng có `"` hoặc dấu cách | `edge-names` fixture + test injection |

---

## 16. Ép bằng máy — tóm tắt cấu hình

```
eslint.config.js
├── @typescript-eslint (strict)
├── react-hooks, react
├── import (order, no-cycle, no-internal-modules)
├── tools/eslint-rules/no-node-in-ui.js
├── tools/eslint-rules/no-driver-id-branching.js
├── tools/eslint-rules/no-raw-sql-concat.js
└── tools/eslint-rules/no-literal-string.js       (chỉ views/ và dialogs/)

.dependency-cruiser.cjs                            luật tầng (monorepo.md §5)
tools/check-contract.mjs                            5 kiểm tra contract
tools/check-i18n.mjs                                khoá đủ 3 ngôn ngữ
tools/check-bundle-size.mjs                         ≤ 900 KB gzip
vitest coverage thresholds                          theo package
```

Toàn bộ chạy trong `pnpm verify`. **`pnpm verify` xanh là điều kiện tối thiểu, không phải mục tiêu.**
