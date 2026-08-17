# Ước lượng công sức

## 1. Cảnh báo về độ tin cậy

Con số dưới đây là **ước lượng có phương pháp, không phải cam kết**. Độ tin cậy giảm theo
khoảng cách thời gian:

| Phạm vi | Độ tin cậy | Ý nghĩa |
|---|---|---|
| W-0, W-1 | ±20% | Đủ để lập kế hoạch chi tiết |
| W-2, W-3 | ±35% | Đủ để lập kế hoạch quý |
| W-4, W-5 | ±50% | Chỉ để định hướng |
| W-6 → W-9 | ±100% | **Chỉ là thứ tự ưu tiên, không phải lịch** |

Ai dùng số của W-6 trở đi để cam kết với khách hàng là đang tự tạo rắc rối.

## 2. Đơn vị và giả định

- **1 person-week (pw)** = 1 kỹ sư × 5 ngày làm việc, đã trừ họp, review, và 15% trả nợ kỹ thuật.
- Kỹ sư có kinh nghiệm TypeScript và ít nhất một RDBMS.
- Không tính thời gian tuyển dụng, onboarding, hay nghỉ phép.
- Đã bao gồm: viết test, viết tài liệu người dùng, code review, sửa lỗi trong wave.
- **Chưa** bao gồm: thời gian chờ mua chứng chỉ ký số, thời gian phản hồi từ beta tester.

## 3. Ước lượng theo epic

| Epic | Nội dung | pw | Ghi chú |
|---|---:|---:|---|
| E-001 | Nền tảng monorepo | 4 | Rủi ro thấp, việc cơ học |
| E-002 | Contract & Transport | 8 | **Rủi ro cao** — backpressure và reconnect dễ bị đánh giá thấp |
| E-003 | Driver layer (3 engine + conformance) | 14 | Conformance suite chiếm 5 pw, đáng giá |
| E-004 | Storage & Security | 7 | Vault + migration + 4 test rò rỉ |
| E-005 | Kết nối | 8 | SSH tunnel + host key là phần khó |
| E-006 | Điều hướng & Objects | 9 | Chống N+1 cho từng engine |
| E-007 | **DataGrid** | 12 | **Rủi ro cao nhất của W-1** |
| E-008 | Data Editor | 14 | Optimistic lock + preview + 12 cell editor |
| E-009 | SQL Editor | 13 | `splitStatements` một mình đã 4 pw |
| E-010 | Object Designer | 16 | `alterTable` diff là phần đắt nhất toàn dự án |
| E-011 | Job & File | 7 | Worker thread + FileGateway + upload resume |
| E-012 | Import / Export | 15 | 6 parser + 9 formatter + 5 mode |
| E-013 | Backup / Restore | 10 | |
| E-014 | Query Builder & Diagram | 11 | React Flow + elkjs giảm được nhiều |
| E-015 | Automation | 9 | Leader election + SMTP + CLI |
| E-016 | Server Security | 10 | 3 engine × mô hình quyền rất khác nhau |
| E-017 | Monitoring | 5 | |
| E-018 | Multi-user web | 8 | OIDC + RBAC + audit |
| E-019 | Shell & Settings | 12 | Tab thật + hợp nhất i18n + 7 mục settings |
| E-020 | Đóng gói & Phát hành | 8 | Ký số, CI ma trận, Docker |
| | **Tổng tới GA (1.0.0)** | **200 pw** | |

## 4. Sau GA

| Wave | Nội dung | pw |
|---|---|---:|
| W-6 | Transfer/Sync (18) + Model (14) + DataGen (10) + DataDict (5) + driver MSSQL (8) | 55 |
| W-7 | MongoDB (18) + Redis (12) + Agent (6) + macOS/Linux (8) | 44 |
| W-8 | AI (10) + Profiling (8) + Oracle (12) + Console (4) + debugger PG (6) | 40 |
| W-9 | BI (25) + Collaboration (14) + làm cứng (12) | 51 |
| | **Tổng sau GA** | **190 pw** |

**Toàn bộ: ≈ 390 pw.**

## 5. Quy đổi sang lịch

| Quy mô team | Tới GA | Toàn bộ | Ghi chú |
|---|---|---|---|
| 2 người | 100 tuần (~23 tháng) | 195 tuần | Quá chậm; rủi ro mất động lực và mất tính cạnh tranh |
| **4 người** | **50 tuần → thực tế 37 tuần**¹ | 95 tuần (~22 tháng) | **Khuyến nghị** |
| 6 người | 33 tuần → thực tế 30 tuần² | 63 tuần | Cần chia module rõ, chi phí phối hợp tăng |
| 8 người | 25 tuần → thực tế 26 tuần² | 49 tuần | **Không hiệu quả** — chi phí phối hợp vượt lợi ích |

¹ 200 pw / 4 = 50 tuần nếu tuần tự. Thực tế 37 tuần vì nhiều epic chạy song song (frontend làm
UI trên `transport-mock` trong khi backend làm driver).

² Định luật Brooks: thêm người vào dự án đang chạy không giảm thời gian theo tỉ lệ. Với 8 người,
thời gian **tăng** so với 6 vì mọi thay đổi contract phải đồng bộ qua nhiều người hơn.

**Cấu hình đề xuất cho 4 người:**

| Vai trò | Trách nhiệm chính |
|---|---|
| FE-1 | DataGrid, Data Editor, cell editor — module khó nhất phía UI |
| FE-2 | Shell, SQL Editor, Designer, Settings, i18n |
| BE-1 | Contract, transport, engine router, job runner, storage, security |
| BE-2 | Driver layer (3 engine), dialect, DDL generator, conformance suite |

Cả 4 người cùng làm import/export và backup ở W-3 (việc chia được theo định dạng).

## 6. Mười công việc đắt nhất

Đây là những chỗ cần chú ý nhất khi lập kế hoạch:

| # | Công việc | pw | Vì sao đắt |
|---|---|---:|---|
| 1 | `DdlGenerator.alterTable` diff (4 engine) | 12 | Cú pháp mỗi engine khác; phát hiện rename; cảnh báo; SQLite recreate; 160 golden case |
| 2 | `DataGrid` chất lượng sản xuất | 12 | Ảo hoá 2 chiều + sửa cell + chọn vùng + hiệu năng + a11y |
| 3 | Import/Export 6 định dạng × 5 mode | 15 | Mỗi parser có ca lệ riêng; streaming; encoding; đường nhanh mỗi engine |
| 4 | Driver conformance cho 1 engine | 5/engine | 180 test case; nhiều hành vi chỉ lộ ra khi test thật |
| 5 | `splitStatements` (4 dialect) | 4 | Tokenizer viết tay; 8 trường hợp khó; sai một cái là phá dữ liệu |
| 6 | Data Synchronization merge join | 8 | Streaming; collation; rollback script; cross-engine |
| 7 | Server Security 3 engine | 10 | Mô hình quyền của MySQL/PG/MSSQL khác nhau về bản chất |
| 8 | Transport backpressure + reconnect | 5 | Dễ viết sai; lỗi chỉ lộ ra ở tải cao |
| 9 | MongoDB view riêng | 18 | Gần như một sản phẩm thứ hai: grid phẳng + tree + json + pipeline |
| 10 | BI (chart + dashboard) | 25 | 16 loại chart + builder + layout engine |

## 7. Rủi ro và đệm

| Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu | Đệm |
|---|---|---|---|---|
| `DataGrid` khó hơn dự kiến | Cao | +4 pw | Làm sớm ở W-1, benchmark trong CI từ ngày đầu | +4 pw ở W-1 |
| `alterTable` phát sinh ca lệ | Cao | +6 pw | Golden file từ đầu; thêm case mỗi khi phát hiện | +6 pw ở W-2 |
| Native module vỡ khi đóng gói | Trung bình | +3 pw | Smoke test sau đóng gói từ W-0 | +3 pw ở W-3 |
| Chứng chỉ ký số chậm | Trung bình | Chặn phát hành | Bắt đầu mua từ W-1 (T-503) | — |
| Transport có lỗi ở tải cao | Trung bình | +3 pw | Test tải trong CI nightly | +3 pw ở W-1 |
| Đánh giá thấp i18n (900 khoá) | Cao | +3 pw | CI ép khoá đủ ngay từ W-0 | +3 pw ở W-2 |
| Phản hồi beta đòi làm lại UX | Trung bình | +8 pw | Beta kín ở W-2 (sớm), không đợi W-3 | +8 pw ở W-4 |

**Tổng đệm: 27 pw ≈ 13% của 200 pw.** Đã tính vào con số 37 tuần cho GA.

## 8. Chỉ số theo dõi

Đo mỗi wave, ghi vào bảng dưới. Nếu velocity lệch > 25% so với ước lượng, **xem lại ước lượng
của các wave sau**, không phải bắt team làm nhanh hơn.

| Wave | pw ước lượng | pw thực tế | Lệch | Số task hoàn thành | Lỗi P0/P1 mở khi ra wave |
|---|---:|---:|---:|---:|---:|
| W-0 | 40 | | | | |
| W-1 | 46 | | | | |
| W-2 | 38 | | | | |
| W-3 | 40 | | | | |
| W-4 | 26 | | | | |
| W-5 | 37 | | | | |
