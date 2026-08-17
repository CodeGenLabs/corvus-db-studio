# ADR-0008: Zod làm nguồn sự thật duy nhất của contract

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-17
- **Liên quan**: ADR-0002, [rpc-contract.md](../rpc-contract.md)

## Bối cảnh

Contract cần đồng thời:
1. **Type TypeScript** cho client và server (compile-time)
2. **Validate runtime** ở server (không được tin client)
3. **Tài liệu** cho người và AI agent

Nếu ba thứ này khai báo riêng thì chúng sẽ lệch nhau — không phải "nếu" mà là "khi nào".

## Phương án đã cân nhắc

| Phương án | Type | Validate | Tài liệu | Nhược |
|---|:-:|:-:|:-:|---|
| Chỉ interface TS | ✅ | ❌ | ⚠️ | Không có bảo vệ runtime — không chấp nhận được |
| TS + validate viết tay | ✅ | ✅ | ⚠️ | Khai báo hai lần, chắc chắn sẽ lệch |
| JSON Schema + codegen | ⚠️ | ✅ | ✅ | Bước codegen thêm; DX kém; type suy ra kém tinh |
| Protobuf | ✅ | ✅ | ✅ | Codegen nặng; kém tự nhiên với JSON/union; khó biểu diễn kiểu tinh vi như `CellValue` |
| **Zod** | ✅ (`z.infer`) | ✅ | ✅ (sinh được) | Chi phí runtime khi validate; schema là code nên không dùng được từ ngôn ngữ khác |

## Quyết định

**Zod** là nguồn sự thật. Mỗi method khai báo `params` và `result`/`chunk` bằng zod schema;
TypeScript type suy ra bằng `z.infer`. Server validate mọi params ở runtime. Tài liệu API sinh
tự động từ registry.

Validate chạy **cả ở desktop** dù client và server cùng process — renderer là môi trường không
đáng tin (TM-5 trong [security.md](../security.md)).

## Hệ quả

### Tích cực
- Không thể có tình trạng type và validation lệch nhau.
- Thông điệp lỗi validate rõ ràng, chỉ đúng field sai.
- Schema kèm luôn metadata (`permission`, `audit`, `guard`) → một chỗ để rà soát bảo mật.
- Sinh được tài liệu API và cả bộ sinh dữ liệu test (`zod-fixture`).

### Tiêu cực / cái giá
- Chi phí parse ở runtime. Đo được: ~15 µs cho params điển hình — không đáng kể so với thời
  gian query. **Ngoại lệ**: không validate từng `ResultChunk` (chunk 1 000 dòng × 20 cột sẽ
  tốn). Chunk được tin vì do chính engine tạo ra; chỉ validate ở ranh giới vào.
- Schema là code TypeScript → client viết bằng ngôn ngữ khác không dùng lại được. Chấp nhận:
  hiện chưa có nhu cầu; nếu cần thì xuất JSON Schema từ zod.
- Bundle client tăng ~12 KB (gzip) vì zod. Chấp nhận được.

### Việc phải làm kèm theo
- `T-010` `defineUnary` / `defineStream` helper trong `@corvus/contract`.
- `T-015` `tools/check-contract.mjs`: mọi method có handler, mọi handler có method, mọi method
  có ít nhất một test.
- `T-016` `tools/gen-api-docs.ts` sinh `docs/api/` từ registry.
- Quy tắc trong coding-rules: **cấm** dùng `z.any()` trong contract; dùng `z.unknown()` và
  thu hẹp ở handler.
