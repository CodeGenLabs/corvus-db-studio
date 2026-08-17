# SPEC-11: Automation (Batch Job & Scheduler)

- **Trạng thái**: Ready
- **Wave**: W-5
- **Tier**: T1
- **Phụ thuộc**: SPEC-08, SPEC-10, ADR-0009, [streaming-and-jobs.md](../02-architecture/streaming-and-jobs.md)
- **Task**: T-350 … T-374

## 1. Mục tiêu

Gom nhiều việc thành một batch job, chạy thủ công hoặc theo lịch cron, nhận thông báo kết quả.
UI Jobs view đã có trong shell hiện tại.

## 2. Phạm vi

**Trong**: batch job (tập hợp step), lập lịch cron, chạy thủ công, lịch sử chạy, log, thông báo
email/webhook, chạy từ CLI, leader election ở web nhiều instance.
**Ngoài**: workflow có nhánh điều kiện (không phải mục tiêu v1.0 — batch là tuần tự).

## 3. Yêu cầu chức năng

### 3.1 Batch job

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-11.01 | Tạo batch job có tên, mô tả, và danh sách step có thứ tự | MUST |
| FR-11.02 | Loại step: **query** (saved query), **backup**, **restore**, **import**, **export**, **transfer**, **datasync**, **structsync**, **datagen**, **datadict** | MUST |
| FR-11.03 | Step MUST tham chiếu tới profile đã lưu (SPEC-08/09/10), không lặp lại cấu hình | MUST |
| FR-11.04 | Step từ nhiều connection khác nhau trong cùng một job | MUST |
| FR-11.05 | Đổi thứ tự step (move up/down, kéo thả) | MUST |
| FR-11.06 | Tuỳ chọn `Continue on error` cấp job và cấp step | MUST |
| FR-11.07 | Chạy thủ công (`Run now`), hiện log realtime | MUST |
| FR-11.08 | Huỷ job đang chạy → step hiện tại được huỷ và dọn dẹp | MUST |
| FR-11.09 | Nhân bản batch job | SHOULD |
| FR-11.10 | Step MUST bị chặn nếu connection đích ở read-only và step là mutating | MUST |

### 3.2 Lịch

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-11.11 | Lập lịch bằng biểu thức cron, có timezone | MUST |
| FR-11.12 | UI MUST có bộ dựng cron thân thiện (hằng giờ / hằng ngày / hằng tuần / tuỳ chỉnh) và hiện diễn giải bằng chữ | MUST |
| FR-11.13 | Hiện lần chạy kế tiếp và 5 lần kế tiếp | MUST |
| FR-11.14 | Bật/tắt lịch mà không xoá | MUST |
| FR-11.15 | Ở web nhiều instance, mỗi lần chạy MUST chỉ xảy ra một lần (leader election) | MUST |
| FR-11.16 | Ở desktop, nếu chế độ nền tắt, UI MUST cảnh báo lịch chỉ chạy khi app mở | MUST |
| FR-11.17 | Job đang chạy khi tới giờ chạy tiếp MUST bị bỏ qua (không chạy chồng), có ghi log | MUST |

### 3.3 Lịch sử & log

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-11.18 | Lịch sử chạy: thời điểm, thời lượng, trạng thái, người/lịch khởi động, tóm tắt | MUST |
| FR-11.19 | Log chi tiết từng step, xem được, tải về được | MUST |
| FR-11.20 | Log MUST được ghi ra file, không giữ trong RAM; stream về UI dạng tail | MUST |
| FR-11.21 | Lịch sử MUST được xoay vòng (giữ N lần chạy hoặc M ngày, cấu hình được) | SHOULD |
| FR-11.22 | Thẻ tổng quan: dung lượng backup 7 ngày, thời lượng trung bình, tỉ lệ thành công | SHOULD |

### 3.4 Thông báo

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-11.23 | Email qua SMTP: host, port, TLS/SSL/none, xác thực, from, to, cc, subject, body | MUST |
| FR-11.24 | Chọn khi nào gửi: thành công / thất bại / cả hai | MUST |
| FR-11.25 | Đính kèm file sinh ra (export, data dictionary) vào email, có giới hạn dung lượng | SHOULD |
| FR-11.26 | Nút "Gửi thử" để kiểm tra cấu hình SMTP | MUST |
| FR-11.27 | Webhook: POST JSON tới URL, có secret HMAC header | SHOULD |
| FR-11.28 | Nội dung thông báo MUST đi qua redaction | MUST |
| FR-11.29 | Mật khẩu SMTP MUST nằm trong `SecretVault` | MUST |

### 3.5 CLI

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| FR-11.30 | `corvus run-job <name|id> [--workspace <path>]` chạy batch job, exit code 0/1 | MUST |
| FR-11.31 | CLI MUST in log ra stdout, phù hợp để dùng trong CI | MUST |
| FR-11.32 | CLI MUST dùng cùng `SecretVault` với app trên cùng máy | MUST |

## 4. Giao diện

| Component | Đường dẫn | Trạng thái |
|---|---|---|
| `JobsView` | `packages/ui/src/views/JobsView.tsx` | **đã có** — nối logic thật |
| `BatchJobEditor` | `…/automation/BatchJobEditor.tsx` | mới |
| `StepPicker` | `…/automation/StepPicker.tsx` | mới (available ↔ selected, kéo thả) |
| `CronBuilder` | `…/automation/CronBuilder.tsx` | mới |
| `RunHistoryGrid` | `…/automation/RunHistoryGrid.tsx` | dùng `DataGrid` |
| `LogViewer` | `…/automation/LogViewer.tsx` | mới (tail, tìm kiếm, tải về) |
| `NotificationForm` | `…/automation/NotificationForm.tsx` | mới |

Trạng thái: empty (chưa có job → nút "Tạo batch job đầu tiên") · loading · ready · error
(job lỗi hiện đỏ trong danh sách) · unsupported (không có).

## 5. Hợp đồng RPC

```ts
export const scheduleCreate = defineUnary({
  name: 'schedule.create',
  params: z.object({
    batchJobId: z.string().uuid(),
    cron: z.string().refine(isValidCron, 'invalid cron'),
    timezone: z.string().default('UTC'),
    enabled: z.boolean().default(true),
  }),
  result: z.object({ scheduleId: z.string(), nextRuns: z.array(z.string()).length(5) }),
  permission: 'job:manage',
  audit: 'full',
})

export const jobLog = defineStream({
  name: 'job.log',
  params: z.object({ jobRunId: z.string().uuid(), fromLine: z.number().int().default(0) }),
  chunk: z.object({ lines: z.array(z.object({ n: z.number(), ts: z.string(), level: LogLevel, text: z.string() })), done: z.boolean() }),
  permission: 'job:run',
  audit: 'none',
})

export const notifyTest = defineUnary({
  name: 'notify.test',
  params: z.object({ config: NotifyConfig }),
  result: z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true) }),
    z.object({ ok: z.literal(false), error: CorvusErrorSchema }),
  ]),
  permission: 'job:manage',
  audit: 'metadata',
})
```

Còn lại: `batchJob.list/get/create/update/delete/duplicate`, `batchJob.runNow`,
`schedule.list/update/delete/runNow`, `jobRun.list/get`, `job.cancel`.

## 6. Logic engine

### Chạy batch job

```
1. Tạo job_run (status=queued)
2. Kiểm quyền + read-only cho mọi step mutating TRƯỚC khi bắt đầu (fail fast)
3. Với từng step theo thứ tự:
     a. Ghi log "── Step k/n: <tên> ──"
     b. Chạy step qua JobRunner (worker thread)
     c. Lỗi → nếu continueOnError thì ghi log và tiếp, không thì dừng
     d. Cập nhật progress = k/n (kết hợp progress trong step)
4. Ghi tóm tắt, đặt status
5. Gửi thông báo theo cấu hình
```

Nếu bị huỷ: huỷ step hiện tại, đợi nó dọn dẹp xong, đánh dấu `cancelled`.

### Leader election (web nhiều instance)

```sql
-- Mỗi instance thử chiếm khoá trước khi chạy
INSERT INTO schedule_lock (schedule_id, fire_at, instance_id, acquired_at)
VALUES (?, ?, ?, ?)
ON CONFLICT (schedule_id, fire_at) DO NOTHING;
-- rowCount = 1 ⇒ instance này được chạy
```
`fire_at` là thời điểm dự kiến (đã làm tròn tới giây) → cùng một lần bắn chỉ một instance
chiếm được. Khoá cũ hơn 24 h bị dọn.

### Scheduler

`node-cron` với `timezone`. Nạp từ bảng `schedule` lúc khởi động, đăng ký lại khi có thay đổi
qua RPC. Kiểm tra `nextRun` mỗi phút và ghi vào DB để UI hiển thị.

## 7. Khác biệt theo target

| | Web | Desktop | CLI |
|---|---|---|---|
| Scheduler | Trong server, luôn chạy, leader election | Trong main process; cần chế độ tray | Không có scheduler; dùng cron/Task Scheduler bên ngoài |
| Log | File trên server, tải qua download token | File cục bộ, mở được thư mục | stdout |
| Email attachment | Đọc từ `tmp/` trên server | Đọc từ đĩa | Đọc từ đĩa |

## 8. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Step tham chiếu profile đã bị xoá | Validate khi mở editor và trước khi chạy; báo `PROFILE_NOT_FOUND`, không chạy |
| Connection của step không mở được | Step fail; `continueOnError` quyết định có tiếp không |
| SMTP lỗi | Job vẫn tính là thành công (nếu các step ok); log ghi lỗi gửi mail; UI hiện cảnh báo riêng |
| Engine crash khi job đang chạy | Lúc khởi động lại: job → `failed` với `INTERRUPTED`; **không tự chạy lại** |
| Job chạy quá lâu | Timeout cấp job (cấu hình, mặc định 6 giờ) → huỷ và báo |
| Hai lần bắn chồng nhau | Bỏ qua lần sau, ghi log (FR-11.17) |

## 9. Hiệu năng

| Kịch bản | Ngưỡng |
|---|---|
| Độ trễ bắn lịch | ≤ 5 s so với thời điểm dự kiến |
| `jobRun.list` với 10 000 lần chạy | ≤ 200 ms (có index + phân trang) |
| Tail log file 500 MB | ≤ 300 ms cho 200 dòng cuối |
| Scheduler với 500 lịch | RAM thêm ≤ 20 MB |

## 10. Bảo mật

`job:run` để chạy, `job:manage` để tạo/sửa lịch. Mọi step mutating kiểm read-only **trước khi**
bắt đầu. Mật khẩu SMTP trong vault. Webhook có HMAC. Log và email đi qua redaction.
Audit `full` cho tạo/sửa lịch và mỗi lần chạy (ai/gì khởi động).

## 11. i18n

`automation.newJob`, `automation.steps`, `automation.availableJobs`, `automation.selectedJobs`,
`automation.moveUp`, `automation.moveDown`, `automation.continueOnError`,
`automation.runNow`, `automation.running`, `automation.cancel`,
`schedule.cron`, `schedule.timezone`, `schedule.preset.*` (4), `schedule.nextRuns`,
`schedule.enabled`, `schedule.desktopWarning`, `schedule.skippedOverlap`,
`notify.email`, `notify.webhook`, `notify.when.*` (3), `notify.smtp.*` (7),
`notify.sendTest`, `notify.attachFiles`, `run.history`, `run.log`, `run.downloadLog`,
`run.status.*` (5), `error.profileNotFound`, `error.jobInterrupted`

## 12. Tiêu chí chấp nhận

```
[ ] FR-11.01–32 đều có test
[ ] Batch job 5 step chạy tuần tự đúng thứ tự, log rõ ràng (integration)
[ ] continueOnError: step 2 lỗi → step 3,4,5 vẫn chạy; không bật thì dừng ở 2
[ ] Huỷ giữa step: step hiện tại dọn dẹp, transaction rollback
[ ] Cron: lịch bắn đúng giờ (test với timezone khác nhau, gồm DST)
[ ] Leader election: 3 instance, 1 lịch → chạy đúng 1 lần (integration)
[ ] Engine crash giữa job → khởi động lại đánh dấu failed, KHÔNG tự chạy lại
[ ] Bắn chồng bị bỏ qua và ghi log
[ ] SMTP: gửi thử thành công/thất bại đều báo đúng; mật khẩu không rò vào log
[ ] CLI: run-job trả exit code đúng, log ra stdout
[ ] Step mutating bị chặn khi đích read-only, chặn TRƯỚC khi bắt đầu
[ ] Desktop: cảnh báo lịch khi chế độ nền tắt
[ ] 5 trạng thái UI · i18n vi/en/ja đủ
```
