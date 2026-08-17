# SPEC-05: Query Builder trực quan

- **Trạng thái**: Ready
- **Wave**: W-4
- **Tier**: T2
- **Phụ thuộc**: SPEC-02, SPEC-04
- **Task**: T-200 … T-212

## 1. Mục tiêu

Người dùng dựng câu `SELECT` bằng cách kéo bảng vào canvas và tick cột, không cần biết SQL.
SQL sinh ra hiện đồng thời và **luôn** chỉnh tay được (một chiều: builder → SQL).

## 2. Phạm vi

**Trong**: chỉ `SELECT`. Canvas bảng + đường join, các tab FROM / SELECT / WHERE / GROUP BY /
HAVING / ORDER BY, subquery, alias, aggregate, DISTINCT.
**Ngoài**: INSERT/UPDATE/DELETE (dùng SQL Editor). Parse SQL → builder (một chiều, xem §6).

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-05.01 | Kéo/nhấp đúp bảng từ pane bên trái MUST thêm vào canvas | MUST |
| FR-05.02 | Join MUST tự sinh theo foreign key khi thêm bảng liên quan | MUST |
| FR-05.03 | Kéo cột A → cột B MUST tạo join thủ công | MUST |
| FR-05.04 | Nhấp đường join MUST đổi được loại: INNER / LEFT / RIGHT / FULL / CROSS / custom | MUST |
| FR-05.05 | Tick cột MUST thêm vào SELECT; tick `*` chọn tất cả | MUST |
| FR-05.06 | Đặt alias được cho bảng, cột, subquery | MUST |
| FR-05.07 | Áp aggregate (COUNT/SUM/AVG/MIN/MAX) cho cột SELECT | MUST |
| FR-05.08 | WHERE MUST hỗ trợ AND/OR, nhóm ngoặc, negate, và điều kiện custom | MUST |
| FR-05.09 | GROUP BY và HAVING MUST xây được, đổi thứ tự được | MUST |
| FR-05.10 | ORDER BY MUST xây được với chiều asc/desc và thứ tự cột | MUST |
| FR-05.11 | Pane SQL MUST cập nhật realtime khi builder đổi | MUST |
| FR-05.12 | Nút "Sang SQL Editor" MUST chuyển sang editor với SQL đã sinh | MUST |
| FR-05.13 | Nút "Chạy" MUST chạy trực tiếp và hiện kết quả bằng `DataGrid` | MUST |
| FR-05.14 | Xoá bảng MUST tự xoá các join liên quan | MUST |
| FR-05.15 | Subquery MUST thêm được vào FROM và WHERE (`IN (SELECT …)`) | SHOULD |
| FR-05.16 | Builder MUST chỉ khả dụng khi `caps.sql` là SQL engine (ẩn với MongoDB/Redis) | MUST |
| FR-05.17 | Trạng thái builder MUST lưu cùng saved query để mở lại chỉnh tiếp | SHOULD |

## 4. Giao diện

| Component | Đường dẫn |
|---|---|
| `QueryBuilderView` | `packages/ui/src/views/QueryBuilderView.tsx` |
| `BuilderCanvas` | `…/querybuilder/BuilderCanvas.tsx` |
| `TableNode`, `JoinEdge` | `…/querybuilder/` |
| `ClauseTabs` (FROM/SELECT/WHERE/GROUP/HAVING/ORDER) | `…/querybuilder/clauses/` |
| `SqlPreviewPane` | `…/querybuilder/SqlPreviewPane.tsx` |

Layout 3 cột: Objects (trái) · Canvas trên + Clause tabs dưới (giữa) · SQL (phải).
Canvas dùng cùng thư viện layout với ER Diagram (xem SPEC-07) để không có 2 engine canvas.

## 5. Hợp đồng RPC

Không có method mới. Builder là **thuần client**: nó dựng `QueryModel` rồi gọi
`@corvus/sql/build/buildSelect(model, dialect)` để sinh SQL, rồi dùng `query.execute`.

```ts
// packages/sql/src/build/types.ts
export interface QueryModel {
  distinct: boolean
  from: FromItem[]                  // bảng, view, hoặc subquery, có alias
  joins: JoinItem[]                 // { left, right, type, on: Condition[] }
  select: SelectItem[]              // { expr, alias?, aggregate? }
  where: ConditionGroup | null
  groupBy: ExprRef[]
  having: ConditionGroup | null
  orderBy: { expr: ExprRef; dir: 'ASC' | 'DESC' }[]
  limit?: number; offset?: number
}
```

`buildSelect` phải quote identifier theo dialect và sinh param placeholder đúng kiểu.

## 6. Một chiều — quyết định thiết kế

Builder → SQL là **một chiều**. Không parse SQL tay viết ngược lại thành builder.

Lý do: parse ngược đòi hỏi một SQL parser hoàn chỉnh cho 5 dialect, và bất kỳ SQL nào builder
không biểu diễn được (window function, CTE, lateral join) sẽ bị **mất âm thầm** khi người dùng
quay lại builder. Mất SQL của người dùng là lỗi không thể tha thứ.

UI thể hiện điều này rõ ràng: khi người dùng đã chỉnh tay trong SQL Editor, quay lại tab
Builder sẽ hiện cảnh báo *"Builder sẽ ghi đè các chỉnh sửa tay. Tiếp tục?"*

## 7. Khác biệt theo engine

| Engine | Khác biệt | Xử lý |
|---|---|---|
| MySQL | Không có FULL OUTER JOIN | Ẩn lựa chọn đó |
| SQLite | Không RIGHT/FULL JOIN (< 3.39) | Ẩn theo version |
| Oracle | `FETCH FIRST` thay `LIMIT` | `buildSelect` dùng `dialect.buildLimit` |
| MongoDB / Redis | Không SQL | Builder không khả dụng (FR-05.16) |

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Model không hợp lệ (SELECT rỗng) | Pane SQL hiện `-- chưa chọn cột`, nút Chạy vô hiệu hoá |
| Join thiếu điều kiện ON | Cảnh báo trên đường join, cho phép (CROSS JOIN) nhưng có nhắc |
| Bảng bị xoá khỏi DB | Node hiện đỏ, "Bảng không còn tồn tại" |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Sinh SQL sau mỗi thay đổi | ≤ 16 ms (đồng bộ, không debounce) |
| Canvas với 20 bảng × 40 cột | ≥ 55 fps khi kéo |

## 10. Bảo mật

`query:execute`. Builder chỉ sinh `SELECT` → không phá huỷ. Điều kiện custom (`{t:'raw'}`) đi
qua cùng đường như filter AST của SPEC-03.

## 11. i18n

`qb.addTable`, `qb.removeTable`, `qb.joinType.*` (6), `qb.editJoin`, `qb.alias`,
`qb.distinct`, `qb.aggregate.*` (5), `qb.allFields`, `qb.toEditor`, `qb.overwriteWarning`,
`qb.tab.*` (6), `qb.notSupported`

## 12. Tiêu chí chấp nhận

```
[ ] FR-05.01–17 đều có test
[ ] buildSelect: golden file ≥ 30 model → SQL cho mỗi dialect
[ ] Join tự sinh đúng theo FK (integration, sakila)
[ ] Xoá bảng → join liên quan mất theo
[ ] SQL sinh ra chạy được thật (integration: build → execute)
[ ] Cảnh báo ghi đè khi người dùng đã chỉnh tay
[ ] Ẩn hoàn toàn với MongoDB/Redis
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
