# Capability Matrix

Bảng tra cứu năng lực của từng engine. Đây là **tài liệu đối chiếu**; giá trị thực thi nằm trong
`packages/driver-*/src/capabilities.ts` và phải khớp với bảng này.

Ký hiệu: ✅ có · ❌ không · ⚠️ có nhưng hạn chế (xem ghi chú) · — không áp dụng

## 1. Cấu trúc phân cấp

| | PG | MySQL | SQLite | MSSQL | Oracle | MongoDB | Redis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `hasCatalogs` | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ⚠️¹ |
| `hasSchemas` | ✅ | ❌² | ❌ | ✅ | ✅ | ❌ | ❌ |

¹ Redis: 16 numbered database (db0–db15), map thành "catalog".
² MySQL: `database` ≡ `schema`. UI hiển thị một cấp duy nhất.

## 2. Loại object

| | PG | MySQL | SQLite | MSSQL | Oracle | MongoDB | Redis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| table | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| materializedView | ✅ | ❌ | ❌ | ⚠️³ | ✅ | — | — |
| procedure | ✅⁴ | ✅ | ❌ | ✅ | ✅ | — | — |
| function | ✅ | ✅ | ❌⁵ | ✅ | ✅ | ✅⁶ | — |
| package | ❌ | ❌ | ❌ | ❌ | ✅ | — | — |
| trigger | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| sequence | ✅ | ❌ | ❌ | ✅ | ✅ | — | — |
| index | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| domain | ✅ | ❌ | ❌ | ✅ | ❌ | — | — |
| type | ✅ | ❌ | ❌ | ✅ | ✅ | — | — |
| event | ❌ | ✅ | ❌ | ⚠️⁷ | ✅⁸ | — | — |
| collection | — | — | — | — | — | ✅ | — |
| keyspace | — | — | — | — | — | — | ✅ |

³ MSSQL: indexed view. ⁴ PG 11+. ⁵ SQLite: chỉ hàm do ứng dụng đăng ký, không quản lý được.
⁶ MongoDB: system.js. ⁷ SQL Agent Job. ⁸ DBMS_SCHEDULER.

## 3. SQL

| | PG | MySQL | SQLite | MSSQL | Oracle |
|---|:-:|:-:|:-:|:-:|:-:|
| `parameterStyle` | `dollar` `$1` | `question` `?` | `question` `?` | `at` `@p1` | `colon` `:1` |
| `identifierQuote` | `"` | `` ` `` | `"` | `[]` | `"` |
| `limitSyntax` | limit-offset | limit-offset | limit-offset | offset-fetch | offset-fetch⁹ |
| `maxIdentifierLength` | 63 | 64 | ∞ | 128 | 128¹⁰ |
| `caseSensitivity` | lower | ⚠️¹¹ | insensitive | insensitive | upper |
| CTE | ✅ | ✅ 8.0+ | ✅ 3.8.3+ | ✅ | ✅ |
| Window functions | ✅ | ✅ 8.0+ | ✅ 3.25+ | ✅ | ✅ |
| `RETURNING` | ✅ | ❌ | ✅ 3.35+ | ⚠️ OUTPUT | ✅ |
| Upsert | ✅ ON CONFLICT | ✅ ON DUP KEY | ✅ ON CONFLICT | ⚠️ MERGE | ⚠️ MERGE |

⁹ Oracle 12c+; 11g trở xuống dùng ROWNUM. ¹⁰ Oracle 12.2+; trước đó 30.
¹¹ MySQL phụ thuộc `lower_case_table_names` và hệ điều hành → **phải đọc từ server lúc connect**.

## 4. Thực thi

| | PG | MySQL | SQLite | MSSQL | Oracle | MongoDB | Redis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| streamingCursor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ SCAN |
| multipleStatements | ✅ | ⚠️¹² | ❌¹⁵ | ✅ | ❌ | — | ✅ |
| multipleResultSets | ✅ | ✅ | ❌ | ✅ | ⚠️ refcursor | — | — |
| cancelStatement | ✅ | ✅ | ❌¹⁶ | ✅ | ✅ | ✅ | ⚠️ |
| explain | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| explainAnalyze | ✅ | ✅ 8.0.18+ | ❌ | ⚠️ | ✅ | ✅ | ❌ |
| preparedStatements | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |

¹² MySQL cần bật `multipleStatements` khi connect — **mặc định TẮT vì rủi ro SQL injection**;
chỉ bật cho session của SQL Editor, không bao giờ cho `data.*`.
¹⁵ SQLite (đo 2026-08-19, T-024b): `better-sqlite3` chạy MỘT câu lệnh cho mỗi `prepare()`.
Nhiều câu lệnh phải tách trước bằng `splitStatements`. Trước đây bảng này ghi ✅ — sai.
¹⁶ SQLite: `better-sqlite3` là API **đồng bộ** và không có `interrupt()`, nên không cắt được
một câu lệnh đang chạy. Huỷ giữa các dòng thì được, nhưng không đạt bảo đảm ≤ 200 ms của
driver-spi §5 → khai `false`. Conformance C6 bị skip **có ghi lý do**, không skip im lặng.

## 5. Giao dịch

| | PG | MySQL | SQLite | MSSQL | Oracle | MongoDB | Redis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| supported | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️¹³ | ⚠️¹⁴ |
| savepoints | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **ddlTransactional** | ✅ | ❌ | ✅ | ✅ | ❌ | — | — |
| isolation levels | 4 | 4 | ⚠️ 2 | 5 | 2 | ⚠️ | — |

¹³ MongoDB: chỉ trên replica set / sharded cluster. ¹⁴ Redis: MULTI/EXEC, không rollback.

> `ddlTransactional` quyết định UI: engine nào ✅ thì nút "Save" trong Table Designer chạy toàn
> bộ ALTER trong một transaction và rollback được. Engine nào ❌ thì UI **phải cảnh báo**
> "thay đổi này không thể hoàn tác tự động" và đề nghị backup trước.

## 6. Công cụ

| | PG | MySQL | SQLite | MSSQL | Oracle | MongoDB | Redis |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| logicalBackup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| physicalBackup | ⚠️ | ⚠️ | ✅ copy file | ✅ | ✅ | ⚠️ | ✅ RDB |
| userManagement | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ 6+ |
| roleManagement | ✅ | ✅ 8.0+ | ❌ | ✅ | ✅ | ✅ | ⚠️ ACL |
| processMonitor | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| serverVariables | ✅ | ✅ | ⚠️ pragma | ✅ | ✅ | ✅ | ✅ |
| dataGeneration | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| profiling | ✅ | ✅ | ❌¹⁷ | ✅ | ✅ | ✅ | ❌ |

¹⁷ SQLite không có profiler phía server (`EXPLAIN QUERY PLAN` chỉ cho kế hoạch, không có số
đo). Trước đây bảng ghi ✅ — sai; sửa cùng T-024b để UI không hiện tab Profiling trống.

## 7. Cách UI dùng bảng này

```tsx
// ✅ ĐÚNG
const { capabilities: caps } = useConnection(connectionId)

{caps.objects.materializedView && (
  <TreeFolder label={t.materializedViews} kind="matview" />
)}

<Button disabled={!caps.exec.explainAnalyze} title={
  caps.exec.explainAnalyze ? undefined : t.notSupportedByEngine
}>
  Explain Analyze
</Button>
```

```tsx
// ❌ SAI — sẽ bị ESLint chặn
{connection.driverId === 'postgres' && <MaterializedViewFolder />}
```

Khi một tính năng không được hỗ trợ, UI **ẩn hoặc vô hiệu hoá kèm tooltip giải thích**, không
bao giờ để người dùng bấm rồi nhận lỗi từ server.

## 8. Capability phát hiện lúc chạy

Một số capability không biết trước khi connect, phải hỏi server:

| Capability | Cách phát hiện |
|---|---|
| `sql.caseSensitivity` (MySQL) | `SELECT @@lower_case_table_names` |
| `objects.procedure` (PG) | version ≥ 11 |
| `exec.explainAnalyze` (MySQL) | version ≥ 8.0.18 |
| `tx.supported` (MongoDB) | `hello.setName != null` |
| `roleManagement` (MySQL) | version ≥ 8.0 |
| `objects.materializedView` (MSSQL) | luôn ❌ — indexed view xử lý như index |

Driver phải trả `DriverConnection.capabilities` đã **thu hẹp theo server thật**, không phải
capability tĩnh của driver. UI luôn đọc capability của *connection*, không phải của *driver*.
