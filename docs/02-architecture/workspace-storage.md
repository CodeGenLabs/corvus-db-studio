# Lưu trữ Workspace

## 1. Workspace là gì

Tất cả những gì người dùng tạo ra và muốn giữ lại: profile kết nối, query đã lưu, snippet,
model, batch job, lịch sử, favorite, virtual group, cấu hình.

Lưu trong **một file SQLite** (`workspace.db`) + một thư mục file phụ.

Vì sao SQLite: giao dịch thật, truy vấn được, một file dễ backup/di chuyển, chạy giống hệt
nhau ở desktop và server, và Corvus vốn đã có driver SQLite.

## 2. Vị trí

| Target | Đường dẫn |
|---|---|
| Windows desktop | `%APPDATA%\Corvus Studio\workspace.db` |
| macOS desktop | `~/Library/Application Support/Corvus Studio/workspace.db` |
| Linux desktop | `~/.config/corvus-studio/workspace.db` |
| Web server | `$CORVUS_DATA_DIR/workspace.db` (mặc định `/var/lib/corvus`) |

Thư mục kèm theo:
```
<data-dir>/
├── workspace.db          SQLite chính
├── workspace.db-wal      WAL
├── secrets.dat           chỉ desktop — ciphertext DPAPI
├── known_hosts           SSH host key đã tin
├── backups/              file backup mặc định
├── logs/                 log xoay vòng
├── tmp/                  file tạm của job (dọn khi khởi động)
└── models/               file model .corvusmodel
```

## 3. Schema

```sql
-- ---------- Người dùng & phân quyền (chỉ dùng thật ở web) ----------
CREATE TABLE app_user (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  email         TEXT,
  password_hash TEXT,                    -- argon2id; NULL nếu dùng OIDC
  oidc_subject  TEXT UNIQUE,
  role          TEXT NOT NULL DEFAULT 'editor',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  last_login_at TEXT
);

-- ---------- Kết nối ----------
CREATE TABLE connection (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES app_user(id),
  name         TEXT NOT NULL,
  driver_id    TEXT NOT NULL,
  color        TEXT,                     -- connection coloring
  mode         TEXT NOT NULL DEFAULT 'read-write' CHECK (mode IN ('read-write','read-only')),
  group_id     TEXT REFERENCES vgroup(id),
  -- Cấu hình KHÔNG chứa bí mật. Bí mật nằm ở bảng secret / OS keychain.
  config_json  TEXT NOT NULL,
  tunnel_json  TEXT,                     -- cấu hình SSH
  tls_json     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX ix_connection_owner ON connection(owner_id);

CREATE TABLE connection_acl (
  connection_id TEXT NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
  principal_id  TEXT NOT NULL,           -- user id
  access_level  TEXT NOT NULL CHECK (access_level IN ('read','write','admin')),
  PRIMARY KEY (connection_id, principal_id)
);

-- ---------- Bí mật (chỉ dùng ở web; desktop dùng OS keychain) ----------
CREATE TABLE secret (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  connection_id TEXT,
  kind          TEXT NOT NULL,
  ciphertext    BLOB NOT NULL,           -- AES-256-GCM
  iv            BLOB NOT NULL,
  tag           BLOB NOT NULL,
  key_version   INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);

-- ---------- Query & snippet ----------
CREATE TABLE saved_query (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  connection_id TEXT REFERENCES connection(id) ON DELETE SET NULL,
  database_name TEXT, schema_name TEXT,
  name          TEXT NOT NULL,
  sql           TEXT NOT NULL,
  params_json   TEXT,                    -- định nghĩa query parameter
  group_id      TEXT REFERENCES vgroup(id),
  created_at    TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE query_history (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,
  connection_id TEXT,
  sql           TEXT NOT NULL,
  executed_at   TEXT NOT NULL,
  duration_ms   INTEGER,
  row_count     INTEGER,
  outcome       TEXT NOT NULL,           -- ok | error | cancelled
  error_code    TEXT
);
CREATE INDEX ix_history_owner_time ON query_history(owner_id, executed_at DESC);

CREATE TABLE snippet (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  name TEXT NOT NULL, body TEXT NOT NULL,
  driver_id TEXT,                        -- NULL = dùng cho mọi engine
  is_builtin INTEGER NOT NULL DEFAULT 0
);

-- ---------- Profile công cụ (import/export/backup/transfer/sync/datagen) ----------
CREATE TABLE tool_profile (
  id       TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  kind     TEXT NOT NULL,                -- import|export|backup|transfer|datasync|structsync|datagen|datadict
  name     TEXT NOT NULL,
  connection_id TEXT,
  config_json   TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

-- ---------- Job & lịch ----------
CREATE TABLE batch_job (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  steps_json TEXT NOT NULL,              -- danh sách bước, có thứ tự
  continue_on_error INTEGER NOT NULL DEFAULT 0,
  notify_json TEXT,                      -- email/webhook
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE schedule (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT NOT NULL REFERENCES batch_job(id) ON DELETE CASCADE,
  cron TEXT NOT NULL, timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled INTEGER NOT NULL DEFAULT 1,
  next_run_at TEXT, last_run_at TEXT
);

CREATE TABLE job_run (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT, kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  status TEXT NOT NULL,                  -- queued|running|succeeded|failed|cancelled
  started_at TEXT, finished_at TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT,
  log_path TEXT                          -- file log dưới logs/
);
CREATE INDEX ix_jobrun_time ON job_run(started_at DESC);

-- ---------- Tổ chức & cá nhân hoá ----------
CREATE TABLE vgroup (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  parent_id TEXT REFERENCES vgroup(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,                   -- connection|query|backup|model|...
  name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE favorite (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  label TEXT NOT NULL, uri TEXT NOT NULL,
  slot INTEGER                           -- 1..9 cho phím tắt Ctrl+N
);

CREATE TABLE setting (
  owner_id TEXT NOT NULL, key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  PRIMARY KEY (owner_id, key)
);

-- ---------- Audit ----------
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, ts TEXT NOT NULL,
  actor_id TEXT NOT NULL, action TEXT NOT NULL,
  connection_id TEXT, target TEXT,
  outcome TEXT NOT NULL, duration_ms INTEGER,
  sql TEXT, rows_affected INTEGER,
  client_ip TEXT, user_agent TEXT
);
CREATE INDEX ix_audit_time ON audit_log(ts DESC);

-- ---------- Metadata ----------
CREATE TABLE schema_migration (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL,
  checksum TEXT NOT NULL
);
```

## 4. Migration

- File SQL đánh số trong `packages/storage/migrations/0001_init.sql`, `0002_….sql`, …
- Chạy tự động lúc khởi động, trong một transaction, có checksum chống sửa file cũ.
- **Chỉ tiến, không lùi.** Muốn đổi cột thì thêm migration mới.
- Trước khi migrate: tự sao lưu `workspace.db` sang `workspace.db.bak-<version>`.
- Nếu `user_version` của file > version app biết → **từ chối khởi động** với thông báo rõ
  ("workspace này tạo bởi phiên bản mới hơn"). Không được downgrade âm thầm.

## 5. Cấu hình PRAGMA

```sql
PRAGMA journal_mode = WAL;        -- cho phép đọc song song khi đang ghi
PRAGMA synchronous  = NORMAL;     -- đủ an toàn với WAL
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Server web có thể có nhiều worker → **chỉ một process được ghi**. Kiến trúc: một
`StorageService` chạy trong process chính; worker gọi qua nội bộ. Không mở nhiều
write-connection tới cùng file qua NFS (tài liệu vận hành phải cấm).

## 6. Nhập / xuất workspace

```
corvus workspace export --out my-workspace.corvusws [--include-secrets]
corvus workspace import my-workspace.corvusws
```

Định dạng `.corvusws` = zip chứa:
```
manifest.json      { version, exportedAt, appVersion, includesSecrets }
workspace.json     dump JSON của mọi bảng (trừ audit_log, query_history)
models/            file model
```

Mặc định **không** kèm secret. Khi có `--include-secrets`, người dùng phải nhập passphrase;
secret được mã hoá lại bằng khoá dẫn xuất từ passphrase (PBKDF2, 600k vòng).

Đây cũng là cơ chế **di chuyển giữa desktop và web** — người dùng xuất từ desktop, nhập lên
server, giữ nguyên mọi thứ.

## 7. Cache metadata (tách riêng)

Metadata schema của database từ xa (danh sách bảng, cột, identifier cho code completion)
**không** lưu trong `workspace.db`. Nó ở cache riêng:

```
<data-dir>/cache/<connectionId>/<databaseHash>.msgpack
```

- Có TTL và bản version (dựa trên số object + max updated timestamp nếu engine hỗ trợ).
- Bị xoá khi: DDL chạy (topic `schema.invalidated`), người dùng bấm Refresh, hoặc app nâng cấp.
- Xoá toàn bộ cache không mất dữ liệu người dùng → an toàn để dọn tự do.
