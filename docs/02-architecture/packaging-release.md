# Đóng gói & Phát hành

## 1. Ba artifact

| Artifact | Định dạng | Kênh phân phối |
|---|---|---|
| **Web** | Docker image `corvus/studio:X.Y.Z` (multi-arch amd64/arm64) | GHCR / Docker Hub |
| **Desktop Windows** | `Corvus-Studio-Setup-X.Y.Z.exe` (NSIS) + `Corvus-Studio-X.Y.Z-portable.exe` | GitHub Releases + auto-update feed |
| **CLI** | `corvus-cli-X.Y.Z-win-x64.exe`, `-linux-x64`, npm `@corvus/cli` | GitHub Releases + npm |

macOS/Linux desktop: build sẵn trong CI từ W3 nhưng **chưa phát hành chính thức** cho tới W7.

---

## 2. Native module — vấn đề lớn nhất của đóng gói

Ba dependency là native addon:

| Package | Dùng cho | Rủi ro |
|---|---|---|
| `better-sqlite3` | `workspace.db` + driver SQLite | Phải khớp ABI của Electron |
| `oracledb` | Oracle | Dùng **thin mode**, không cần Instant Client |
| `cpu-features`/`sshcrypto` (của `ssh2`) | Tăng tốc SSH | **Tuỳ chọn** — phải chạy được khi thiếu |

Quy tắc:

1. **Ưu tiên tuyệt đối package thuần JS.** Trước khi thêm native dep phải có ADR.
2. `ssh2` cấu hình để native binding là optional; fallback JS phải được test.
3. `better-sqlite3` rebuild cho Electron bằng `@electron/rebuild` trong bước postinstall của
   `apps/desktop`; server web dùng prebuild của Node.
4. CI build ma trận: `{win-x64, win-arm64} × {node, electron}`.
5. Có smoke test sau khi đóng gói: chạy app đã build và kiểm `require('better-sqlite3')` OK.

---

## 3. Web

### Dockerfile (nhiều tầng)

```dockerfile
# --- builder ---
FROM node:22-bookworm AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY packages packages
COPY apps/web apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @corvus/app-web... build

# --- runtime ---
FROM node:22-bookworm-slim AS runtime
# bookworm-slim, KHÔNG alpine: better-sqlite3 và oracledb cần glibc
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/apps/web/server/dist ./server
COPY --from=builder /app/apps/web/client/dist ./public
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production CORVUS_DATA_DIR=/var/lib/corvus
VOLUME /var/lib/corvus
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s CMD node server/healthcheck.js
CMD ["node", "server/index.js"]
```

### docker-compose mẫu (giao cho người dùng)

```yaml
services:
  corvus:
    image: corvus/studio:1.0.0
    ports: ['8080:8080']
    environment:
      CORVUS_MASTER_KEY_FILE: /run/secrets/master_key   # BẮT BUỘC
      CORVUS_BASE_URL: https://corvus.example.com
      CORVUS_AUTH_MODE: local            # hoặc oidc
      CORVUS_HOST_POLICY_FILE: /etc/corvus/host-policy.yaml
    volumes:
      - corvus-data:/var/lib/corvus
    secrets: [master_key]
volumes: { corvus-data: }
secrets:
  master_key: { file: ./master.key }
```

Server **từ chối khởi động** nếu thiếu `CORVUS_MASTER_KEY` — không được tự sinh khoá tạm rồi
mất dữ liệu ở lần restart sau.

### Biến môi trường

| Biến | Bắt buộc | Mặc định | Ghi chú |
|---|:-:|---|---|
| `CORVUS_MASTER_KEY` / `_FILE` | ✅ | — | 32 byte base64 |
| `CORVUS_DATA_DIR` | | `/var/lib/corvus` | |
| `CORVUS_PORT` | | `8080` | |
| `CORVUS_BASE_URL` | ✅ (prod) | — | Cho cookie + CSRF |
| `CORVUS_AUTH_MODE` | | `local` | `local` \| `oidc` \| `none`¹ |
| `CORVUS_OIDC_*` | | | issuer, clientId, clientSecret |
| `CORVUS_HOST_POLICY_FILE` | | | Chống SSRF |
| `CORVUS_LOG_LEVEL` | | `info` | |
| `CORVUS_MAX_UPLOAD_MB` | | `512` | Cho import |

¹ `none` chỉ dùng khi chạy sau reverse proxy đã xác thực; log cảnh báo lớn khi bật.

---

## 4. Desktop (Electron)

### `electron-builder.yml`

```yaml
appId: io.corvus.studio
productName: Corvus DB Studio
copyright: © 2026 Archway Co., Ltd.
directories: { output: release, buildResources: build }
files:
  - 'main/dist/**'
  - 'preload/dist/**'
  - 'renderer/dist/**'
  - '!**/*.map'
asar: true
asarUnpack:
  - '**/node_modules/better-sqlite3/**'   # native module không nằm trong asar được
  - '**/node_modules/ssh2/**'
win:
  target:
    - { target: nsis,     arch: [x64, arm64] }
    - { target: portable, arch: [x64] }
  icon: build/icon.ico
  signingHashAlgorithms: [sha256]
nsis:
  oneClick: false
  perMachine: false                       # cài theo user, không cần quyền admin
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
publish:
  provider: generic
  url: https://downloads.corvus.io/desktop
```

### Cấu hình BrowserWindow bắt buộc

```ts
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,        // BẮT BUỘC
    nodeIntegration: false,        // BẮT BUỘC
    sandbox: true,                 // BẮT BUỘC
    preload: join(__dirname, '../preload/dist/index.cjs'),
  },
  titleBarStyle: 'hidden',         // ta tự vẽ title bar (đã có trong UI)
  titleBarOverlay: false,
  backgroundColor: '#efeee9',      // khớp --bg, tránh nháy trắng
  show: false,                     // show khi 'ready-to-show' → NFR-04
})
```

### Ký số

- Chứng chỉ EV Code Signing (token cứng hoặc Azure Trusted Signing).
- Ký cả `.exe` cài đặt lẫn `.exe` chính; verify trong CI bằng `signtool verify /pa`.
- Không có chữ ký → Windows SmartScreen chặn → **không phát hành**.

### Auto-update

`electron-updater` + feed generic (S3/CDN). Quy tắc:
- Kiểm tra lúc khởi động + mỗi 6 giờ (tôn trọng setting `autoUpdate`).
- Tải nền, **không** tự cài. Người dùng bấm "Khởi động lại để cài".
- **Không bao giờ** tự update khi có job đang chạy.
- Có kênh `stable` và `beta`.

---

## 5. CI/CD

```
.github/workflows/
├── ci.yml            PR: lint → typecheck → unit → build → depcruise → e2e(web)
├── integration.yml   nightly: testcontainers, ma trận 7 engine × 3 version
├── release.yml       tag v*: build 3 artifact, ký, publish, sinh changelog
└── security.yml      weekly: pnpm audit, trivy scan image, license check
```

### `ci.yml` — cổng bắt buộc cho mọi PR

```yaml
jobs:
  verify:
    steps:
      - pnpm install --frozen-lockfile
      - pnpm lint                      # eslint + dependency-cruiser
      - pnpm typecheck
      - pnpm test -- --coverage        # ngưỡng: xem testing-strategy.md
      - pnpm build
      - node tools/check-contract.mjs  # mọi method có handler & test
      - pnpm test:e2e:web
  desktop-smoke:
    runs-on: windows-latest
    steps:
      - pnpm --filter @corvus/app-desktop build
      - pnpm test:e2e:desktop          # Playwright + Electron
```

PR không xanh toàn bộ → **không merge**. Không có ngoại lệ, không có `--no-verify`.

---

## 6. Đánh phiên bản

SemVer, **một số phiên bản duy nhất cho cả 3 artifact**.

| Thay đổi | Bump |
|---|---|
| Thêm method vào contract, thêm tính năng | MINOR |
| Sửa lỗi | PATCH |
| Đổi/xoá method trong contract, đổi schema workspace không tương thích ngược | MAJOR |

**Tương thích contract**: web server phiên bản `X.Y.*` phải phục vụ được client `X.(≤Y).*`.
Client gửi `X-Corvus-Contract: <version>` ở mỗi request; server trả `426 Upgrade Required`
nếu quá cũ, UI hiện màn hình "hãy tải lại trang".

---

## 7. Checklist phát hành

```
[ ] Toàn bộ CI xanh trên nhánh release
[ ] Integration test chạy đủ 7 engine
[ ] E2E xanh trên web (4 trình duyệt) và desktop
[ ] Đo lại NFR-01…NFR-05, ghi vào bảng theo dõi
[ ] pnpm audit không có lỗ hổng high/critical
[ ] trivy scan image sạch
[ ] CHANGELOG.md cập nhật
[ ] Kiểm tra migration workspace từ phiên bản trước (thử file thật)
[ ] .exe đã ký, verify OK
[ ] Docker image multi-arch đã push và pull thử được
[ ] Cài thử trên máy Windows sạch
[ ] Tài liệu người dùng cập nhật cho tính năng mới
[ ] Tag `vX.Y.Z` + GitHub Release có ghi chú
```
