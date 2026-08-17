# SPEC-nn: <Tên module>

- **Trạng thái**: Draft | Ready | Implemented
- **Wave**: W-n
- **Tier**: T0 | T1 | T2 | T3
- **Phụ thuộc**: SPEC-xx, ADR-nnnn
- **Task liên quan**: T-nnn … T-nnn

---

## 1. Mục tiêu

Một đoạn: module này giải quyết việc gì cho người dùng. Viết từ góc nhìn người dùng, không
phải góc nhìn kỹ thuật.

## 2. Phạm vi

**Trong phạm vi**
- …

**Ngoài phạm vi** (và ở đâu xử lý)
- … → SPEC-xx

## 3. Yêu cầu chức năng

Đánh số `FR-nn.mm`. Mỗi FR phải **kiểm chứng được**: đọc xong biết ngay cách viết test.

| ID | Yêu cầu | Ưu tiên | Capability cần |
|---|---|---|---|
| FR-nn.01 | Người dùng có thể … | MUST | `CAP.xxx` |
| FR-nn.02 | Khi … thì hệ thống phải … | SHOULD | |

Dùng MUST / SHOULD / MAY theo RFC 2119.

## 4. Giao diện

### 4.1 Component liên quan
| Component | Đường dẫn | Trạng thái |
|---|---|---|
| … | `packages/ui/src/…` | mới / sửa / đã có |

### 4.2 Hành vi UI
Mô tả trạng thái và chuyển tiếp. Bắt buộc có đủ 5 trạng thái:
**empty · loading · ready · error · không được hỗ trợ (capability)**.

### 4.3 Phím tắt
| Phím | Hành động |
|---|---|

## 5. Hợp đồng RPC

Method mới hoặc thay đổi, kèm schema đầy đủ:

```ts
export const xxx = defineUnary({
  name: 'module.action',
  params: z.object({ … }),
  result: z.object({ … }),
  permission: '…',
  audit: '…',
})
```

## 6. Logic engine

Thuật toán, truy vấn cần chạy, thứ tự thao tác, cách xử lý transaction.

## 7. Khác biệt theo engine

| Engine | Khác biệt | Xử lý |
|---|---|---|

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy gì |
|---|---|---|

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|

## 10. Bảo mật

- Quyền cần có
- Có phải thao tác phá huỷ không → cần preview-token?
- Hành vi ở chế độ read-only

## 11. i18n

Danh sách khoá mới cần thêm vào `vi/en/ja`.

## 12. Tiêu chí chấp nhận

Checklist kiểm chứng được, mỗi dòng ánh xạ tới ít nhất một test.

```
[ ] FR-nn.01 — test: packages/…/x.test.ts
[ ] FR-nn.02 — e2e: e2e/….spec.ts
[ ] Hoạt động với ≥ 2 engine
[ ] 5 trạng thái UI đều có
[ ] i18n đủ 3 ngôn ngữ
[ ] Không hồi quy NFR
```
