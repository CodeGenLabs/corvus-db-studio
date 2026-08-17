# SPEC-07: ER Diagram & Model Designer

- **Trạng thái**: Ready
- **Wave**: W-4 (ER view) / W-6 (Model designer)
- **Tier**: T1 (ER) / T2 (Model)
- **Phụ thuộc**: SPEC-02, SPEC-06
- **Task**: T-220 … T-244

## 1. Mục tiêu

**ER view**: xem quan hệ giữa các bảng của một schema đang tồn tại — chỉ đọc, sinh tự động.
**Model designer**: thiết kế schema *trước khi* nó tồn tại, rồi sinh DDL hoặc đồng bộ hai chiều
với database.

Hai thứ khác nhau; dùng chung engine canvas.

## 2. Phạm vi

**Trong**: ER view tự sinh, auto-layout, zoom/pan, sửa FK từ canvas, export ảnh; Model
designer với table/view/relation, layer, note, reverse engineering, forward engineering,
so sánh model ↔ database.
**Ngoài**: conceptual/logical model, dimensional model → T3/T4 (xem feature-inventory).

## 3. Yêu cầu chức năng

### 3.1 ER Diagram view (W-4)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-07.01 | ER MUST tự sinh từ `introspect.tableMeta` của mọi bảng trong schema | MUST |
| FR-07.02 | Node bảng MUST hiện tên bảng, cột, và ký hiệu PK/FK/UQ | MUST |
| FR-07.03 | Đường quan hệ MUST vẽ từ foreign key, có ký hiệu lực lượng (1-n) | MUST |
| FR-07.04 | Auto-layout MUST chạy được (elkjs `layered`), tránh chồng lấn | MUST |
| FR-07.05 | Zoom (`Ctrl+wheel`, nút, slider) và pan (space-drag hoặc chế độ hand) | MUST |
| FR-07.06 | Vị trí node MUST được lưu theo (connection, schema) và giữ khi mở lại | MUST |
| FR-07.07 | Nhấp đúp node MUST mở Table Designer | MUST |
| FR-07.08 | Kéo cột A → cột B MUST tạo FK (qua preview-token của SPEC-06) | SHOULD |
| FR-07.09 | Nhấp phải đường → sửa / xoá FK | SHOULD |
| FR-07.10 | Export PNG / SVG | SHOULD |
| FR-07.11 | Schema > 150 bảng MUST hiện dialog chọn tập bảng thay vì vẽ hết | MUST |
| FR-07.12 | ER MUST ẩn với engine không có FK khái niệm (MongoDB, Redis) | MUST |

### 3.2 Model Designer (W-6)

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-07.13 | Tạo/mở/lưu file model (`.corvusmodel`, JSON) trong workspace | MUST |
| FR-07.14 | Model MUST gắn với một `driverId` đích và một version | MUST |
| FR-07.15 | Thêm/sửa/xoá table, view, relation trên canvas | MUST |
| FR-07.16 | Table trong model dùng **cùng** editor với Table Designer (SPEC-06) | MUST |
| FR-07.17 | Layer, note, label, shape, màu | SHOULD |
| FR-07.18 | **Reverse**: database → model (chọn object, giữ vị trí nếu đã có) | MUST |
| FR-07.19 | **Forward**: model → DDL script, hoặc đồng bộ trực tiếp vào database qua preview-token | MUST |
| FR-07.20 | So sánh model ↔ database: hiện diff hai chiều, chọn từng thay đổi để áp | MUST |
| FR-07.21 | Export diagram PNG/SVG/PDF | SHOULD |
| FR-07.22 | Validate model: FK trỏ cột không tồn tại, kiểu không hợp dialect đích, tên trùng | MUST |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `ErView` | `packages/ui/src/views/ErView.tsx` | **đã có** (tĩnh) — thay bằng canvas thật |
| `DiagramCanvas` | `…/diagram/DiagramCanvas.tsx` | mới — **dùng chung** cho ER, Model, Query Builder |
| `TableNode`, `RelationEdge` | `…/diagram/` | mới |
| `autoLayout` | `…/diagram/autoLayout.ts` | mới (elkjs) |
| `ModelView` | `…/views/ModelView.tsx` | mới |
| `ModelDiffDialog` | `…/dialogs/ModelDiffDialog.tsx` | mới |

Thư viện: **React Flow** cho canvas + **elkjs** cho auto-layout.
Lý do: React Flow xử lý pan/zoom/selection/edge routing đã chín; elkjs cho layout `layered`
chất lượng cao. Tự viết canvas là công việc vô nghĩa ở đây (khác với DataGrid — grid cần
semantic dữ liệu riêng, canvas thì không).

Trạng thái: empty (schema không có bảng) · loading (đang introspect + layout) · ready · error ·
unsupported (MongoDB/Redis).

## 5. Hợp đồng RPC

```ts
export const modelReverse = defineUnary({
  name: 'model.reverse',
  params: z.object({
    connectionId: z.string().uuid(),
    database: z.string(), schema: z.string().optional(),
    objects: z.array(ObjectRef),
  }),
  result: z.object({ model: ModelDocument }),
  permission: 'connection:read',
  audit: 'metadata',
})

export const modelDiff = defineUnary({
  name: 'model.diff',
  params: z.object({ connectionId: z.string().uuid(), model: ModelDocument, target: SchemaRef }),
  result: z.object({
    changes: z.array(z.object({
      id: z.string(),
      direction: z.enum(['model-to-db', 'db-to-model']),
      kind: z.enum(['create', 'alter', 'drop']),
      objectRef: ObjectRef,
      statements: z.array(z.string()),
      warnings: z.array(DdlWarning),
    })),
  }),
  permission: 'connection:read',
  audit: 'metadata',
})

export const modelPreviewSync = defineUnary({
  name: 'model.previewSync',
  params: z.object({ connectionId: z.string().uuid(), model: ModelDocument, target: SchemaRef, changeIds: z.array(z.string()) }),
  result: z.object({ statements: z.array(z.string()), previewToken: z.string(), expiresAt: z.string(), warnings: z.array(DdlWarning) }),
  permission: 'ddl:write',
  audit: 'metadata',
  guard: 'writeGuard',
})
// model.applySync(previewToken) — như ddl.applyTable
```

Vị trí node lưu ở client trong `setting` (`er.layout.<connectionId>.<schema>`), không phải RPC.

## 6. Logic

### Auto-layout
```
1. Dựng graph: node = bảng, edge = FK
2. elkjs: algorithm='layered', direction='RIGHT',
          spacing.nodeNode=60, spacing.edgeNode=30
3. Node đã có vị trí lưu → giữ nguyên (chỉ layout node mới)
4. Nút "Sắp xếp lại tất cả" bỏ vị trí lưu và layout toàn bộ
```

### Ngưỡng an toàn
> 150 bảng: layout và render sẽ chậm và diagram vô nghĩa với người đọc. Hiện dialog chọn tập
bảng, mặc định gợi ý bảng có FK liên quan tới bảng đang chọn (đi 2 bậc).

### Model diff
Dùng lại `DdlGenerator.alterTable` của SPEC-06. Diff hai chiều nghĩa là mỗi thay đổi có thể áp
theo hướng model→db (sinh DDL) hoặc db→model (cập nhật file model). Không tự động; người dùng
tick từng thay đổi.

## 7. Khác biệt theo engine

| Engine | Ghi chú |
|---|---|
| MySQL | FK chỉ có ở InnoDB — bảng MyISAM không có quan hệ để vẽ |
| SQLite | FK có thể khai mà không bật enforcement; vẫn vẽ được |
| MongoDB / Redis | Không hỗ trợ (FR-07.12) |
| Oracle | Nhiều schema → cho chọn nhiều schema trong một diagram |

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Layout timeout (graph quá lớn) | Huỷ sau 10 s, dùng layout grid đơn giản, thông báo |
| FK trỏ bảng ngoài tập đã chọn | Vẽ node "ghost" mờ, có nhãn |
| Model không hợp dialect đích | `modelDiff` trả warning, chặn sync tới khi sửa |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| ER 50 bảng: introspect + layout + render | ≤ 3 s |
| Kéo node trên canvas 50 bảng | ≥ 55 fps |
| Export PNG 4 000 × 3 000 | ≤ 5 s |

## 10. Bảo mật

ER view: chỉ đọc, `connection:read`. Tạo FK từ canvas và model sync: `ddl:write` +
preview-token. Read-only chặn mọi thao tác ghi.

## 11. i18n

`er.autoLayout`, `er.relayoutAll`, `er.zoomIn`, `er.zoomOut`, `er.fitView`, `er.selectMode`,
`er.handMode`, `er.addRelation`, `er.exportPng`, `er.exportSvg`, `er.tooManyTables`,
`er.chooseTables`, `er.notSupported`, `model.new`, `model.open`, `model.save`,
`model.reverse`, `model.forward`, `model.diff.*` (8), `model.validate.*` (5)

## 12. Tiêu chí chấp nhận

```
[ ] FR-07.01–22 đều có test
[ ] ER sinh đúng quan hệ trên schema sakila (integration, 4 engine)
[ ] Vị trí node lưu và khôi phục sau khi mở lại
[ ] > 150 bảng → hiện dialog chọn, không treo
[ ] Tạo FK từ canvas đi qua preview-token
[ ] Reverse → model → forward → DDL: round-trip cho ra schema tương đương (integration)
[ ] Model diff phát hiện đủ: thêm/xoá/sửa bảng, cột, index, FK
[ ] Ẩn hoàn toàn với MongoDB/Redis
[ ] Export PNG/SVG mở được, đúng nội dung
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
