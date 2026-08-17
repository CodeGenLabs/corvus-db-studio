# SPEC-14: AI Assistant

- **Trạng thái**: Ready
- **Wave**: W-8
- **Tier**: T2
- **Phụ thuộc**: SPEC-02, SPEC-04, [security.md](../02-architecture/security.md) §10
- **Task**: T-450 … T-466

## 1. Mục tiêu

Trợ lý AI giúp viết SQL, giải thích query và execution plan, đề xuất index — **mà không bao giờ
gửi dữ liệu dòng ra ngoài**. Panel AI đã có trong Information Pane của shell hiện tại.

## 2. Phạm vi

**Trong**: chat trong Information Pane, sinh SQL từ ngôn ngữ tự nhiên, sửa SQL lỗi, giải thích
query, giải thích execution plan, đề xuất index, cấu hình provider và khoá API, ranh giới dữ liệu.
**Ngoài**: agent tự động chạy DDL/DML (tuyệt đối không — xem §10).

## 3. Yêu cầu chức năng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-14.01 | AI MUST tắt theo mặc định; người dùng bật tường minh trong Settings | MUST |
| FR-14.02 | Người dùng chọn provider: Anthropic / OpenAI / Azure OpenAI / OpenAI-compatible endpoint (local) | MUST |
| FR-14.03 | Khoá API MUST lưu trong `SecretVault`, không bao giờ hiển thị lại sau khi lưu | MUST |
| FR-14.04 | Chat MUST stream token, hiện dần | MUST |
| FR-14.05 | Chat MUST giữ ngữ cảnh trong một phiên; xoá được | MUST |
| FR-14.06 | "Ask AI" từ SQL Editor: sinh SQL từ mô tả tiếng Việt/Anh/Nhật | MUST |
| FR-14.07 | SQL do AI sinh MUST được chèn vào editor để người dùng xem, **KHÔNG tự chạy** | MUST |
| FR-14.08 | "Fix Query": gửi SQL + thông điệp lỗi (đã redact) → nhận bản sửa | SHOULD |
| FR-14.09 | "Explain Query": giải thích SQL bằng ngôn ngữ tự nhiên | SHOULD |
| FR-14.10 | "Explain Plan": gửi execution plan → nhận phân tích và đề xuất | SHOULD |
| FR-14.11 | "Suggest Indexes": gửi schema + query → nhận đề xuất index kèm lý do | SHOULD |
| FR-14.12 | Toàn bộ payload gửi đi MUST xem được trước khi gửi (nút "Xem dữ liệu sẽ gửi") | MUST |
| FR-14.13 | Payload MUST **không bao giờ** chứa giá trị dòng, thông tin kết nối, hay secret | MUST |
| FR-14.14 | Setting `aiSchemaAccess` tắt → chỉ gửi SQL người dùng gõ, không gửi schema | MUST |
| FR-14.15 | Người dùng thấy được số token đã dùng và chi phí ước lượng (nếu provider cung cấp) | SHOULD |
| FR-14.16 | Chip gợi ý nhanh trong panel (đã có trong UI: "Giải thích truy vấn này", "Đề xuất chỉ mục") | MUST |
| FR-14.17 | Lỗi từ provider (rate limit, hết quota, khoá sai) MUST hiện rõ ràng, phân biệt được | MUST |
| FR-14.18 | Ở web, admin MUST cấu hình được: tắt AI toàn hệ thống, hoặc chỉ cho phép endpoint nội bộ | MUST |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `AiPanel` | `packages/ui/src/panes/AiPanel.tsx` | **đã có** trong `InfoPane` — nối logic thật |
| `AiMessage` (markdown + code block có nút Chèn) | `…/ai/AiMessage.tsx` | mới |
| `AiPayloadPreview` | `…/ai/AiPayloadPreview.tsx` | mới — **bắt buộc cho FR-14.12** |
| `AiSettingsSection` | `…/dialogs/settings/AiSection.tsx` | **đã có khung** — thêm provider + khoá |
| `AskAiDialog` | `…/dialogs/AskAiDialog.tsx` | mới (gọi từ SQL Editor) |

Code block trong câu trả lời có nút **"Chèn vào editor"** — không có nút "Chạy".
Đây là quyết định thiết kế, không phải thiếu sót (xem §10).

Trạng thái: empty (AI tắt → panel hiện hướng dẫn bật) · loading (đang stream → con trỏ nhấp
nháy) · ready · error (lỗi provider, phân loại rõ) · unsupported (admin đã tắt toàn hệ thống).

## 5. Hợp đồng RPC

```ts
export const aiChat = defineStream({
  name: 'ai.chat',
  params: z.object({
    sessionId: z.string().uuid(),
    message: z.string().max(20_000),
    /** Ngữ cảnh người dùng CHỦ ĐỘNG cho phép gửi. */
    context: z.object({
      includeSchema: z.boolean().default(false),
      connectionId: z.string().uuid().optional(),
      database: z.string().optional(),
      schema: z.string().optional(),
      /** Chỉ những bảng này, không phải cả schema. */
      tables: z.array(z.string()).max(50).optional(),
      sql: z.string().max(100_000).optional(),
      executionPlan: z.unknown().optional(),
      errorMessage: z.string().optional(),
    }),
  }),
  chunk: z.object({ delta: z.string(), done: z.boolean(), usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }).optional() }),
  permission: 'ai:use',
  audit: 'metadata',
})

export const aiBuildPayload = defineUnary({
  name: 'ai.buildPayload',
  params: aiChat.params,          // cùng params
  /** Trả về ĐÚNG payload sẽ gửi cho provider, để người dùng kiểm tra. */
  result: z.object({
    provider: z.string(),
    model: z.string(),
    messages: z.array(z.object({ role: z.string(), content: z.string() })),
    approxTokens: z.number(),
  }),
  permission: 'ai:use',
  audit: 'none',
})
```

`ai.buildPayload` và `ai.chat` **phải dùng chung một hàm** xây payload. Nếu không, cái người
dùng thấy sẽ khác cái được gửi — đúng lỗi mà ADR-0010 tồn tại để ngăn.

## 6. Logic engine

### Xây payload theo allowlist

```ts
// packages/services/src/ai/buildPayload.ts

/**
 * Allowlist — CHỈ những trường này được đưa vào payload.
 * KHÔNG dùng denylist: thêm trường mới vào TableMeta sẽ tự động bị loại,
 * đó là hành vi an toàn mặc định ta muốn.
 */
const TABLE_ALLOWLIST = ['name', 'comment'] as const
const COLUMN_ALLOWLIST = ['name', 'dataType', 'nullable', 'defaultValue', 'comment', 'isPrimaryKey'] as const
const INDEX_ALLOWLIST = ['name', 'columns', 'unique', 'type'] as const
const FK_ALLOWLIST = ['name', 'columns', 'referencedTable', 'referencedColumns'] as const

export function buildSchemaContext(meta: TableMeta[]): string {
  // Sinh DDL rút gọn từ CHỈ các trường trong allowlist.
  // Tuyệt đối không truy cập meta.sampleRows, meta.estimatedRows là số nên OK.
}
```

Kiểm chứng bằng test: tạo `TableMeta` có trường `__secretSample` chứa sentinel, gọi
`buildSchemaContext`, khẳng định sentinel không xuất hiện.

### System prompt

```
Bạn là trợ lý SQL trong Corvus DB Studio.
- Engine: {driverId} phiên bản {serverVersion}
- Dialect: dùng cú pháp đúng của engine này
- KHÔNG được giả định về dữ liệu; bạn chỉ thấy schema
- Khi sinh SQL phá huỷ (DROP/DELETE/UPDATE/TRUNCATE), phải nêu rõ rủi ro trước
- Trả lời bằng ngôn ngữ người dùng đang dùng ({lang})
```

### Provider adapter

```ts
interface AiProvider {
  id: string
  chat(req: AiRequest, signal: AbortSignal): AsyncIterable<AiDelta>
  countTokens?(text: string): number
}
```
Hiện thực: `AnthropicProvider`, `OpenAiProvider`, `AzureOpenAiProvider`,
`OpenAiCompatibleProvider` (cho Ollama, vLLM, LM Studio).

Cấu hình khoá và endpoint ở cấp user (desktop) hoặc cấp hệ thống + user (web).

## 7. Khác biệt theo target

| | Desktop | Web |
|---|---|---|
| Khoá API | Của người dùng, trong OS keychain | Của người dùng trong vault, **hoặc** khoá dùng chung do admin cấu hình |
| Tắt toàn hệ thống | Không áp dụng | `CORVUS_AI_MODE=off \| internal-only \| any` |
| Gọi provider | Từ máy người dùng | Từ server (người dùng không thấy được khoá dùng chung) |

## 8. Xử lý lỗi

| Tình huống | ErrorCode | Người dùng thấy |
|---|---|---|
| Chưa cấu hình khoá | `AI_NOT_CONFIGURED` | "Hãy thêm khoá API trong Cài đặt → Trợ lý AI" |
| Khoá sai | `AI_AUTH_FAILED` | "Khoá API không hợp lệ" |
| Rate limit | `AI_RATE_LIMITED` | "Provider đang giới hạn, thử lại sau {n}s" |
| Hết quota | `AI_QUOTA_EXCEEDED` | Phân biệt rõ với rate limit |
| Payload quá lớn | `AI_CONTEXT_TOO_LARGE` | Gợi ý giảm số bảng gửi kèm |
| Admin đã tắt | `AI_DISABLED_BY_ADMIN` | Panel hiện thông báo, không có nút bật |
| Provider timeout | `AI_TIMEOUT` | Nút thử lại |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Token đầu tiên xuất hiện | ≤ 2 s (phụ thuộc provider) |
| `ai.buildPayload` với 50 bảng | ≤ 300 ms |
| Render markdown stream | không tụt dưới 55 fps |

## 10. Bảo mật — phần quan trọng nhất của SPEC này

### Ba điều tuyệt đối không

1. **Không gửi giá trị dữ liệu dòng.** Không có tuỳ chọn nào bật được điều này ở v1.0. Nếu về
   sau có nhu cầu, phải là ADR riêng với thiết kế đồng thuận tường minh từng lần.
2. **Không gửi thông tin kết nối** (host, user, mật khẩu, connection string).
3. **AI không được chạy bất cứ thứ gì.** Không có nút "Chạy" trên code block AI sinh ra; không
   có tool-calling để AI gọi RPC. AI chỉ sinh văn bản; con người quyết định.

Điều 3 là quyết định có chủ đích. Một agent tự chạy DDL trên production là rủi ro không tương
xứng với tiện lợi nó mang lại.

### Kiểm chứng

- `ai-payload-leak.test.ts`: dựng `TableMeta` + kết quả query có sentinel; gọi mọi entry point
  của AI; khẳng định sentinel không xuất hiện trong payload.
- `ai-no-execute.test.ts`: khẳđịnh không có đường code nào từ `services/ai` gọi tới
  `query.execute`, `ddl.*`, hay `data.applyChanges`.
- Quyền `ai:use`; audit `metadata` (ghi việc đã gọi AI, không ghi nội dung chat để tôn trọng
  quyền riêng tư — cấu hình được ở web nếu tổ chức yêu cầu).

## 11. i18n

`ai.enable`, `ai.disabled`, `ai.provider`, `ai.model`, `ai.apiKey`, `ai.apiKeySaved`,
`ai.endpoint`, `ai.schemaAccess`, `ai.schemaAccessHint`, `ai.placeholder`,
`ai.chip.explainQuery`, `ai.chip.suggestIndex`, `ai.chip.fixQuery`, `ai.chip.generateSql`,
`ai.viewPayload`, `ai.payloadTitle`, `ai.insertToEditor`, `ai.clearChat`,
`ai.tokensUsed`, `ai.noRowDataNotice`, `error.ai.*` (7)

`ai.noRowDataNotice` hiển thị **cố định** trong panel: *"Trợ lý chỉ thấy cấu trúc schema.
Dữ liệu trong bảng không bao giờ được gửi đi."*

## 12. Tiêu chí chấp nhận

```
[ ] FR-14.01–18 đều có test
[ ] ai-payload-leak.test.ts: không có giá trị dòng nào lọt vào payload
[ ] ai-no-execute.test.ts: không có đường nào từ AI tới thực thi
[ ] ai.buildPayload và ai.chat dùng chung hàm xây payload (test so sánh output)
[ ] AI tắt theo mặc định trên bản mới cài
[ ] Khoá API không hiển thị lại sau khi lưu, không vào log/audit
[ ] Stream token hiện dần, huỷ được giữa chừng
[ ] 4 provider adapter đều chạy (test với mock server)
[ ] Phân biệt đúng 7 loại lỗi provider
[ ] Web: CORVUS_AI_MODE=off → panel hiện AI_DISABLED_BY_ADMIN
[ ] Code block chỉ có nút "Chèn vào editor", không có "Chạy"
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
