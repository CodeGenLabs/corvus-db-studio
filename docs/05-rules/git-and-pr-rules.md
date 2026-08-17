# Git & PR Rules

## 1. Branch

```
<type>/T-nnn-<slug-ngắn>
```

| Type | Dùng cho |
|---|---|
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Đổi cấu trúc, không đổi hành vi |
| `perf` | Tối ưu hiệu năng |
| `test` | Chỉ thêm/sửa test |
| `docs` | Chỉ tài liệu |
| `chore` | Build, CI, dependency |
| `arch` | Thay đổi kiến trúc (**phải** có ADR kèm theo) |

Ví dụ: `feat/T-030-datagrid-virtualization`, `fix/T-142-alter-rename-detection`

Branch **phải** tham chiếu đúng một mã task. Task lớn cần nhiều branch → tách thành nhiều task.

## 2. Commit

Conventional Commits, tiếng Anh, kèm mã task:

```
<type>(<scope>): <mô tả ngắn, thể mệnh lệnh> (T-nnn)

<thân — vì sao, không phải làm gì>

<footer — breaking change, task liên quan>
```

Ví dụ:

```
feat(driver-postgres): stream result sets through pg-cursor (T-023)

Previously the driver awaited client.query() and returned the full array,
which used ~8 GB for a 16M-row table. Now it reads through a cursor in
1000-row batches so engine memory stays flat regardless of result size.

Verified: stream.bench.ts holds at 180 MB for 10M rows (NFR-03 allows 400 MB).
```

| # | Luật |
|---|---|
| 2.1 | Một commit = một thay đổi logic. Không gộp "sửa lỗi + refactor + thêm tính năng" |
| 2.2 | Commit phải build được và test xanh. Không commit trạng thái hỏng |
| 2.3 | Không commit `console.log`, file tạm, `.env`, secret |
| 2.4 | Không `--no-verify`. Không bao giờ |
| 2.5 | Thân commit giải thích **vì sao**; diff đã cho biết **làm gì** |
| 2.6 | Breaking change ghi `BREAKING CHANGE:` ở footer |

Scope là tên package không có tiền tố: `ui`, `contract`, `engine`, `driver-postgres`,
`services`, `storage`, `sql`, `web`, `desktop`, `cli`, `docs`.

## 3. Pull Request

### Khuôn mẫu bắt buộc

```markdown
## Task
T-nnn — <tiêu đề task từ backlog>
SPEC-nn FR-nn.mm, FR-nn.mm

## Đã làm gì
<2–5 dòng. Vì sao chọn cách này nếu có nhiều lựa chọn.>

## Đã kiểm chứng thế nào
```bash
pnpm verify                       # ✅ xanh
pnpm test:it --filter=@corvus/driver-postgres   # ✅ 47 passed
pnpm test:e2e:web -g "data-edit"                # ✅ 6 passed
```
<Nếu chạm UI: ảnh chụp hoặc mô tả đã chạy trên web build và desktop build.>
<Nếu chạm hiệu năng: số đo trước/sau.>

## Chưa làm / đã biết còn thiếu
<Trung thực. Kèm mã task nếu sẽ làm sau. "Không có" cũng là câu trả lời hợp lệ.>

## Checklist
- [ ] Task DoD (docs/04-plan/definition-of-done.md §1) đủ
- [ ] Test cùng PR (luồng chính + luồng lỗi)
- [ ] i18n đủ vi/en/ja (nếu có chuỗi mới)
- [ ] Không có `eslint-disable` / `@ts-expect-error` mới không giải thích
- [ ] Thao tác ghi đi qua preview-token (nếu có)
- [ ] Không có secret nào có thể vào log/error/audit
- [ ] Đã cập nhật SPEC nếu hành vi khác mô tả ban đầu
- [ ] Nếu là quyết định kiến trúc: ADR đã được duyệt TRƯỚC khi code
```

### Luật PR

| # | Luật |
|---|---|
| 3.1 | PR ≤ 400 dòng diff (không tính test, snapshot, golden file, lock file). Lớn hơn → tách |
| 3.2 | Không merge khi CI đỏ. Không có ngoại lệ |
| 3.3 | Cần ít nhất 1 approve. PR chạm bảo mật/contract/driver SPI cần 2 |
| 3.4 | Tác giả không tự approve |
| 3.5 | Squash merge vào `main`. Commit message của squash theo §2 |
| 3.6 | `main` luôn ở trạng thái phát hành được |
| 3.7 | PR mở > 5 ngày làm việc → chia nhỏ hoặc đóng |
| 3.8 | Golden file thay đổi → **phải** giải thích từng thay đổi trong PR |

### PR cần 2 approve

- Chạm `packages/contract` (thay đổi contract ảnh hưởng mọi thứ)
- Chạm `packages/driver-core` (thay đổi SPI ảnh hưởng mọi driver)
- Chạm `packages/storage/src/vault` hoặc bất cứ gì liên quan secret
- Chạm `packages/engine/src/{router,auth,guards}`
- Chạm luồng preview-token
- Thêm/sửa ADR
- Thêm dependency native

## 4. Review

Người review chịu trách nhiệm ngang tác giả. Xem
[review-checklist.md](review-checklist.md).

Quy ước comment:

| Tiền tố | Nghĩa | Chặn merge? |
|---|---|---|
| `blocking:` | Phải sửa | ✅ |
| `question:` | Cần giải thích | ✅ cho tới khi trả lời |
| `suggestion:` | Nên cân nhắc | ❌ |
| `nit:` | Chi tiết nhỏ, tuỳ tác giả | ❌ |
| `praise:` | Ghi nhận điều tốt | ❌ |

Dùng `nit:` cho việc thẩm mỹ. Đừng chặn PR vì dấu phẩy.

## 5. Release

```
main ──┬──> tag v0.5.0 ──> release.yml ──> 3 artifact
       │
       └── hotfix/T-nnn ──> tag v0.5.1
```

| # | Luật |
|---|---|
| 5.1 | Chỉ tag từ `main` (hoặc branch hotfix từ tag) |
| 5.2 | Tag `vX.Y.Z` khớp `version` trong root `package.json` |
| 5.3 | Trước khi tag: chạy đủ checklist phát hành (packaging-release.md §7) |
| 5.4 | CHANGELOG cập nhật trước khi tag, không sau |
| 5.5 | Hotfix: branch từ tag, sửa tối thiểu, cherry-pick về `main` |
| 5.6 | Không force-push lên `main` hay branch đã có tag |

## 6. Điều tuyệt đối không

| ❌ | Vì sao |
|---|---|
| `git push --force` lên `main` | Mất lịch sử, phá build của người khác |
| `--no-verify` | Hook tồn tại để chặn lỗi ngay |
| Commit secret (kể cả rồi xoá ở commit sau) | Lịch sử git là mãi mãi — phải xoay khoá |
| Merge PR của chính mình mà không có review | Không ai kiểm được |
| Commit file build (`dist/`, `release/`) | Repo phình, xung đột vô nghĩa |
| Sửa lịch sử commit đã push và có người pull | Phá bản sao của người khác |
| Commit trực tiếp lên `main` | Bỏ qua CI và review |
