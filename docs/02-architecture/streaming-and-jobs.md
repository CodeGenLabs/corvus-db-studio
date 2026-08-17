# Streaming result set & Job dài hạn

Hai cơ chế thời gian thực của hệ thống. Làm sai chỗ này thì app sẽ treo với dữ liệu thật.

---

## Phần A · Streaming result set

### A.1 Vấn đề

`SELECT * FROM payment` trên bảng 16 triệu dòng.
Cách ngây thơ (`await client.query(sql)` rồi trả mảng) sẽ:
- ngốn ~8 GB RAM ở engine,
- treo event loop hàng chục giây,
- gửi một payload JSON 4 GB qua WebSocket,
- làm sập tab trình duyệt.

### A.2 Kiến trúc bắt buộc

```
Database ──cursor──► Driver ──chunk──► Engine ──frame──► Transport ──► UI store ──► Virtualized grid
         1 000 dòng           back-       ack window        append        render 40
         mỗi lần              pressure    8 chunk           vào ring      dòng thấy được
```

Bốn điểm kiểm soát:

| # | Điểm | Cơ chế | Ngưỡng mặc định |
|---|---|---|---|
| 1 | Driver → Engine | cursor `read(n)` | 1 000 dòng/lần |
| 2 | Engine → Transport | tạm dừng đọc cursor khi hàng đợi đầy | 8 chunk chưa ack |
| 3 | Transport → UI | ack mỗi 4 chunk | |
| 4 | UI store | ring buffer, giữ tối đa N dòng trong RAM | 200 000 dòng, cũ nhất bị đẩy ra |

Khi người dùng cuộn ra ngoài ring buffer, UI phát lại query với `OFFSET` — tài liệu SPEC-03
mô tả chi tiết.

### A.3 Bất biến (kiểm bằng test)

```
IV-1  Engine không bao giờ giữ > 3 chunk trong RAM cho một stream.
IV-2  RAM engine khi stream 10 triệu dòng ≤ 400 MB (NFR-03).
IV-3  Huỷ stream → cursor đóng và lệnh CANCEL gửi tới server trong ≤ 200 ms.
IV-4  Ngắt WebSocket → stream bị đánh dấu 'interrupted', KHÔNG tự chạy lại.
IV-5  Chunk luôn tới đúng thứ tự; `seq` liên tục; UI phát hiện lỗ hổng thì huỷ và báo lỗi.
```

`IV-4` quan trọng: tự chạy lại một `INSERT … RETURNING` sau khi mạng chập chờn có thể ghi dữ
liệu hai lần. Chỉ `SELECT` thuần mới được đề nghị "Thử lại" và phải do người dùng bấm.

### A.4 Giới hạn an toàn

| Giới hạn | Mặc định | Vì sao |
|---|---|---|
| `maxRows` cho `data.browse` | 1 000/trang | Grid có phân trang |
| `maxRows` cho `query.execute` | 500 000 | Sau đó cắt + hiện banner "đã cắt bớt" |
| Kích thước một cell BLOB gửi về | 64 KB | Kèm `size` thật; tải đủ khi mở Cell Editor |
| Timeout query mặc định | 30 s | Cấu hình được theo connection |
| Số stream đồng thời / connection | 4 | Tránh cạn pool |

---

## Phần B · Job dài hạn

### B.1 Job là gì

Thao tác chạy hàng phút tới hàng giờ, phải sống sót khi người dùng đóng tab:
import, export, backup, restore, data transfer, data sync, structure sync, data generation,
data dictionary, batch job.

### B.2 Mô hình

```ts
export interface JobDefinition<K extends JobKind = JobKind> {
  kind: K
  params: JobParams[K]
  actorId: string
  /** Job này có ghi vào database không → ảnh hưởng kiểm tra read-only. */
  mutating: boolean
}

export interface JobHandle {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  progress: number                      // 0..100, -1 nếu không xác định được
  phase: string                          // 'reading-source' | 'writing' | 'verifying' | …
  startedAt: string; finishedAt?: string
  summary?: JobSummary                   // số dòng, dung lượng, đường dẫn file
  error?: CorvusError
}
```

### B.3 JobRunner

```ts
class JobRunner {
  start(def: JobDefinition): Promise<JobHandle>
  cancel(jobId: string): Promise<void>
  get(jobId: string): JobHandle | undefined
  list(filter): JobHandle[]
  logStream(jobId: string): AsyncIterable<LogLine>
}
```

Yêu cầu:
- Chạy trong **worker thread** (`node:worker_threads`), không phải event loop chính.
  Import 5 triệu dòng CSV sẽ chặn toàn bộ RPC nếu chạy chung.
- Ghi tiến trình vào `job_run` mỗi 500 ms, không mỗi dòng.
- Log ghi ra file (`logs/job-<id>.log`), stream về UI dạng tail; không giữ trong RAM.
- Huỷ: đặt cờ, worker kiểm giữa các lô, dọn dẹp (rollback tx, xoá file dở), báo `cancelled`.
- Crash engine → job đang chạy bị đánh dấu `failed` với `INTERRUPTED` lúc khởi động lại
  (không tự chạy lại).

### B.4 Tiến trình có ý nghĩa

Người dùng cần biết *bao lâu nữa*, không chỉ *đang chạy*.

| Loại job | Cách tính % |
|---|---|
| Import file | byte đã đọc / tổng byte file |
| Export | dòng đã ghi / `estimateRowCount` |
| Backup | object đã xong / tổng object, trong object thì theo dòng |
| Restore | byte đã đọc của file backup |
| Transfer | tổng dòng ước lượng của mọi bảng |
| Data sync | 2 pha: so sánh (theo bảng) → áp dụng (theo statement) |
| Data generation | dòng đã sinh / dòng yêu cầu |

Không tính được → `progress: -1`, UI hiện thanh indeterminate, kèm số đếm thô
("đã xử lý 1 240 000 dòng").

### B.5 Scheduler

```ts
class Scheduler {
  // node-cron; đọc bảng `schedule` lúc khởi động; hot-reload khi có thay đổi
  register(s: ScheduleRow): void
  runNow(scheduleId: string): Promise<JobHandle>
}
```

| Target | Hành vi |
|---|---|
| Web | Scheduler chạy trong server → luôn hoạt động. Nhiều instance → dùng leader election qua bảng `schedule_lock` để tránh chạy trùng. |
| Desktop | Chạy trong main process. Nếu người dùng bật "chạy nền", app thu vào tray thay vì thoát. Nếu tắt → lịch chỉ chạy khi app mở, **có cảnh báo rõ trong UI**. |
| CLI | `corvus run-job <name>` — dùng cho cron/Task Scheduler bên ngoài, nếu người dùng thích. |

Không dùng Windows Task Scheduler như Navicat — xem [scope-decisions.md](../01-scope/scope-decisions.md).

### B.6 Thông báo

Khi job kết thúc: `notification` topic → UI hiện toast + badge trên tab Automation.
Nếu job có cấu hình notify: gửi email (SMTP, `nodemailer`) và/hoặc webhook (POST JSON).

Nội dung thông báo **đã redact**, không chứa SQL có dữ liệu nhạy cảm trừ khi người dùng bật
tường minh.

### B.7 Bất biến

```
IV-6   Job chạy trong worker thread, không chặn RPC.
IV-7   Huỷ job phải dọn sạch: transaction rollback, file tạm xoá, kết nối trả về pool.
IV-8   Job ghi dữ liệu (mutating) bị từ chối trên connection read-only.
IV-9   Hai job cùng ghi vào một bảng đích không chạy song song (khoá theo target).
IV-10  Log job không bao giờ chứa secret (đi qua redact).
```

---

## Phần C · Sự kiện đẩy từ server

| Topic | Ai phát | UI làm gì |
|---|---|---|
| `job.progress` | JobRunner mỗi 500 ms | Cập nhật thanh tiến trình |
| `job.finished` | JobRunner | Toast + refresh danh sách |
| `connection.state` | SessionManager | Banner "mất kết nối, đang thử lại" |
| `schema.invalidated` | Sau `ddl.apply*` | Xoá cache react-query của schema đó |
| `notification` | bất kỳ service nào | Trung tâm thông báo |

Quy tắc: sự kiện **chỉ mang tín hiệu, không mang dữ liệu lớn**. UI nhận sự kiện rồi tự gọi
RPC để lấy dữ liệu mới. Nhờ vậy không cần lo về thứ tự và trùng lặp.
