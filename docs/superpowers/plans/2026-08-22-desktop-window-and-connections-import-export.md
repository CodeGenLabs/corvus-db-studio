# Desktop Window Controls & Connections Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement window dragging and functional window control buttons (minimize, maximize, close) in Desktop TitleBar, add Connections Export & Visual Import Dialog in the File menu, and provide a pre-configured `docker-dev-connections.json` file for the 8 dev database engines.

**Architecture:** Extend `@corvus/transport-ipc` with safe IPC window control channels for Electron BrowserWindow management. Update `packages/ui/TitleBar.tsx` with CSS app-region dragging and IPC button triggers. Implement connection backup schema serializer/parser in `packages/ui`, a visual `ImportConnectionsDialog` with conflict resolution, integrate them into `MenuBar.tsx`, and seed `docker-dev-connections.json`.

**Tech Stack:** React 19, TypeScript, Electron 33, `@corvus/transport-ipc`, `@corvus/contract`, `@corvus/ui`, Vitest.

## Global Constraints
- `packages/ui` MUST NEVER import `node:*`, `electron`, or database drivers directly. All desktop features MUST go through `@corvus/transport-ipc` (or `window.corvus`).
- Monorepo boundary rules must be strictly respected (`pnpm verify` must pass with 0 lint, 0 typecheck, 0 test, 0 contract errors).
- All UI strings must support i18n (`tr('Tiếng Việt', 'English')`).

---

### Task 1: Desktop IPC Window Controls Bridge

**Files:**
- Modify: `packages/transport-ipc/src/preload.ts`
- Modify: `packages/transport-ipc/src/host.ts`
- Modify: `apps/desktop/preload/src/index.ts`
- Create: `packages/transport-ipc/src/__tests__/window-controls.test.ts`

**Interfaces:**
- Produces: `WindowControlsApi` in `window.corvus.windowControls` with `{ minimize(), maximize(), close(), isMaximized(): Promise<boolean> }`

- [ ] **Step 1: Write the failing test**
Create `packages/transport-ipc/src/__tests__/window-controls.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { exposeCorvusBridge } from '../preload'

describe('exposeCorvusBridge windowControls', () => {
  it('exposes windowControls on corvus bridge', () => {
    let exposedApi: any
    const mockContextBridge = {
      exposeInMainWorld: (_name: string, api: any) => {
        exposedApi = api
      },
    }
    const mockIpcRenderer = {
      invoke: vi.fn().mockResolvedValue(false),
      postMessage: vi.fn(),
    }

    exposeCorvusBridge(mockContextBridge as any, mockIpcRenderer as any)
    expect(exposedApi).toBeDefined()
    expect(exposedApi.windowControls).toBeDefined()
    expect(typeof exposedApi.windowControls.minimize).toBe('function')
    expect(typeof exposedApi.windowControls.maximize).toBe('function')
    expect(typeof exposedApi.windowControls.close).toBe('function')
    expect(typeof exposedApi.windowControls.isMaximized).toBe('function')

    exposedApi.windowControls.minimize()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('corvus:window:minimize')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @corvus/transport-ipc test`
Expected: FAIL (windowControls is undefined)

- [ ] **Step 3: Implement windowControls in preload and host**
In `packages/transport-ipc/src/preload.ts`:
Add `WindowControlsApi` interface and expose `windowControls` invoking `corvus:window:*`.
In `packages/transport-ipc/src/host.ts` (or helper):
Add IPC handlers `corvus:window:minimize`, `corvus:window:maximize`, `corvus:window:close`, `corvus:window:isMaximized` taking the focused `BrowserWindow`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @corvus/transport-ipc test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/transport-ipc
git commit -m "feat(ipc): add windowControls bridge for desktop window management"
```

---

### Task 2: TitleBar Window Dragging & Window Controls Integration

**Files:**
- Modify: `packages/ui/src/components/TitleBar.tsx`
- Create: `packages/ui/src/components/__tests__/TitleBar.test.tsx`

**Interfaces:**
- Consumes: `window.corvus?.windowControls`
- Produces: Drag region with `-webkit-app-region: drag` and functional minimize, maximize, close buttons with `-webkit-app-region: no-drag`.

- [ ] **Step 1: Write the failing test**
Create `packages/ui/src/components/__tests__/TitleBar.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TitleBar } from '../TitleBar'

describe('TitleBar Window Controls', () => {
  beforeEach(() => {
    ;(window as any).corvus = {
      windowControls: {
        minimize: vi.fn(),
        maximize: vi.fn(),
        close: vi.fn(),
        isMaximized: vi.fn().mockResolvedValue(false),
      },
    }
  })

  it('invokes windowControls.minimize when clicking minimize button', () => {
    render(<TitleBar />)
    const minBtn = screen.getByTitle(/minimize|thu nhỏ/i)
    fireEvent.click(minBtn)
    expect((window as any).corvus.windowControls.minimize).toHaveBeenCalled()
  })

  it('invokes windowControls.maximize when clicking maximize button', () => {
    render(<TitleBar />)
    const maxBtn = screen.getByTitle(/maximize|phóng to/i)
    fireEvent.click(maxBtn)
    expect((window as any).corvus.windowControls.maximize).toHaveBeenCalled()
  })

  it('invokes windowControls.close when clicking close button', () => {
    render(<TitleBar />)
    const closeBtn = screen.getByTitle(/close|đóng/i)
    fireEvent.click(closeBtn)
    expect((window as any).corvus.windowControls.close).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @corvus/ui test TitleBar`
Expected: FAIL (buttons not calling windowControls)

- [ ] **Step 3: Update TitleBar.tsx with dragging style and click handlers**
In `packages/ui/src/components/TitleBar.tsx`:
- Add `WebkitAppRegion: 'drag' as any` on container.
- Add `WebkitAppRegion: 'no-drag' as any` on interactive children (logo, buttons, menus, avatar).
- Add click handlers calling `window.corvus?.windowControls?.minimize()`, `maximize()`, `close()`.
- If `!window.corvus?.windowControls`, hide window control buttons in web browser mode.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @corvus/ui test TitleBar`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/ui/src/components/TitleBar.tsx packages/ui/src/components/__tests__/TitleBar.test.tsx
git commit -m "feat(ui): enable titlebar window dragging and window control buttons"
```

---

### Task 3: Connection Export & Import Serialization Logic

**Files:**
- Create: `packages/ui/src/utils/connection-export-import.ts`
- Create: `packages/ui/src/utils/__tests__/connection-export-import.test.ts`

**Interfaces:**
- Produces:
  - `serializeConnectionsBackup(connections: ConnectionProfile[]): string`
  - `parseConnectionsBackup(jsonStr: string): { valid: boolean, connections: ConnectionProfile[], error?: string }`
  - `exportConnectionsFile(connections: ConnectionProfile[], filename?: string): void`

- [ ] **Step 1: Write the failing test**
Create `packages/ui/src/utils/__tests__/connection-export-import.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { serializeConnectionsBackup, parseConnectionsBackup } from '../connection-export-import'
import type { ConnectionProfile } from '@corvus/contract'

describe('connection-export-import utils', () => {
  const sampleProfiles: ConnectionProfile[] = [
    {
      id: 'conn-1',
      name: 'PostgreSQL Dev',
      driverId: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'corvus_dev',
      user: 'corvus_dev',
    },
  ]

  it('serializes connection profiles into backup JSON string', () => {
    const json = serializeConnectionsBackup(sampleProfiles)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.connections).toHaveLength(1)
    expect(parsed.connections[0].name).toBe('PostgreSQL Dev')
  })

  it('parses valid backup JSON string', () => {
    const json = serializeConnectionsBackup(sampleProfiles)
    const result = parseConnectionsBackup(json)
    expect(result.valid).toBe(true)
    expect(result.connections).toHaveLength(1)
    expect(result.connections[0].driverId).toBe('postgres')
  })

  it('returns invalid on corrupted JSON string', () => {
    const result = parseConnectionsBackup('invalid json')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @corvus/ui test connection-export-import`
Expected: FAIL

- [ ] **Step 3: Implement serializeConnectionsBackup, parseConnectionsBackup, exportConnectionsFile**
Create `packages/ui/src/utils/connection-export-import.ts` with validation and file download trigger via Blob URL.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @corvus/ui test connection-export-import`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/ui/src/utils/connection-export-import.ts packages/ui/src/utils/__tests__/connection-export-import.test.ts
git commit -m "feat(ui): add connection backup serialization and parsing utilities"
```

---

### Task 4: Import Connections Dialog UI Component

**Files:**
- Create: `packages/ui/src/components/dialogs/ImportConnectionsDialog.tsx`
- Create: `packages/ui/src/components/dialogs/__tests__/ImportConnectionsDialog.test.tsx`
- Modify: `packages/ui/src/store/studio.ts`

**Interfaces:**
- Consumes: `parseConnectionsBackup`, `useClient()`, `useStudio()`
- Produces: `ImportConnectionsDialog` modal with list preview, selection checkboxes, conflict resolution ('overwrite' | 'rename' | 'skip'), and import submission.

- [ ] **Step 1: Write the failing test**
Create `packages/ui/src/components/dialogs/__tests__/ImportConnectionsDialog.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportConnectionsDialog } from '../ImportConnectionsDialog'

describe('ImportConnectionsDialog', () => {
  it('renders connections preview and triggers import on click', async () => {
    const mockConnections = [
      { id: '1', name: 'MySQL Dev', driverId: 'mysql', host: '127.0.0.1', port: 3306, user: 'root' },
    ]
    render(<ImportConnectionsDialog open={true} connections={mockConnections as any} onClose={vi.fn()} onImport={vi.fn()} />)
    expect(screen.getByText('MySQL Dev')).toBeDefined()
    expect(screen.getByText(/127.0.0.1:3306/)).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @corvus/ui test ImportConnectionsDialog`
Expected: FAIL

- [ ] **Step 3: Implement ImportConnectionsDialog component**
Create `packages/ui/src/components/dialogs/ImportConnectionsDialog.tsx` using standard modal styles, database icons, table preview, and batch `connection.create` / `connection.update` calls.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @corvus/ui test ImportConnectionsDialog`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/ui/src/components/dialogs/ImportConnectionsDialog.tsx packages/ui/src/components/dialogs/__tests__/ImportConnectionsDialog.test.tsx
git commit -m "feat(ui): add ImportConnectionsDialog with preview and conflict resolution"
```

---

### Task 5: Integrate Import/Export in MenuBar & App Store

**Files:**
- Modify: `packages/ui/src/components/MenuBar.tsx`
- Modify: `packages/ui/src/App.tsx`
- Modify: `packages/ui/src/store/studio.ts`

**Interfaces:**
- Produces: Menu entries under `File`:
  - `Xuất danh sách kết nối… (Export connections…)`
  - `Nhập danh sách kết nối… (Import connections…)`

- [ ] **Step 1: Write the failing test**
Create `packages/ui/src/components/__tests__/MenuBar-connection-actions.test.tsx` verifying the menu items are registered under `File`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter @corvus/ui test MenuBar-connection-actions`
Expected: FAIL

- [ ] **Step 3: Update MenuBar.tsx and App.tsx**
In `MenuBar.tsx`:
Add Export and Import actions to `file` menu.
Hidden `<input type="file" accept=".json" />` to trigger file picker.
In `App.tsx`:
Mount `<ImportConnectionsDialog />` when `s.importConnData` is present.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter @corvus/ui test MenuBar-connection-actions`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/ui/src/components/MenuBar.tsx packages/ui/src/App.tsx packages/ui/src/store/studio.ts packages/ui/src/components/__tests__/MenuBar-connection-actions.test.tsx
git commit -m "feat(ui): wire Import and Export connections in File menu and App root"
```

---

### Task 6: Seed Docker Dev Stack Connections File

**Files:**
- Create: `docker-dev-connections.json`
- Create: `tools/__tests__/docker-dev-connections.test.ts`

**Interfaces:**
- Produces: `docker-dev-connections.json` root file containing configurations for:
  1. PostgreSQL (5432)
  2. MySQL (3306)
  3. MariaDB (3307)
  4. SQL Server (1434)
  5. Oracle 23 Free (1521)
  6. MongoDB (27017)
  7. Redis (6379)
  8. SQLite (`.corvus-data/sample.sqlite`)

- [ ] **Step 1: Create failing test for docker-dev-connections.json**
Create `tools/__tests__/docker-dev-connections.test.ts` asserting that `docker-dev-connections.json` exists, validates against schema, and has all 8 database profiles with correct ports.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm vitest run tools/__tests__/docker-dev-connections.test.ts`
Expected: FAIL

- [ ] **Step 3: Create docker-dev-connections.json**
Populate `docker-dev-connections.json` with all 8 database connection configurations and credentials matching `docker/dev-db/compose.yaml`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm vitest run tools/__tests__/docker-dev-connections.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add docker-dev-connections.json tools/__tests__/docker-dev-connections.test.ts
git commit -m "feat(dev): add docker-dev-connections.json seed profile for local dev stack"
```

---

### Task 7: Full Monorepo Verification Gate

- [ ] **Step 1: Run pnpm verify**
Run: `pnpm verify`
Expected: ALL 7 verification steps pass 100% green (eslint, depcruise, typecheck, build, test, contract, doctor).

- [ ] **Step 2: Commit any final polishing**
```bash
git commit --allow-empty -m "chore: full verification gate passed"
```