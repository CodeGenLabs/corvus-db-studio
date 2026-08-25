# Corvus DB Studio Project Constitution & Golden Rules

## Core Principles (Non-Negotiables)

1. **RPC Boundary Separation**:
   - `packages/ui` must **NEVER** import `node:*`, `electron`, `better-sqlite3`, `pg`, `mysql2`, or any native database drivers.
   - All communication between UI and Engine/Drivers must flow through RPC Client (`@corvus/client` / `@corvus/transport-*`).

2. **Capability-Based Branching**:
   - Never write code branching by `driverId === 'postgres'`.
   - Branch strictly by feature capabilities (`driver.capabilities.supportsJson`, `driver.capabilities.supportsReturning`, etc.).

3. **Preview-Token Required for Mutations**:
   - Every database write/alter/drop/execute operation MUST follow the preview-token pattern:
     - 1. Request preview (`preview*`) → generates SQL and returns preview-token.
     - 2. User inspects SQL and approves.
     - 3. Execute change (`apply*`) using verified preview-token.

4. **Zero External Font Requests & Tight CSP**:
   - All fonts bundled locally in `@corvus/ui/src/theme/fonts.css`.
   - 0 HTTP requests to external domains at runtime.

5. **Bounded Streaming Memory**:
   - Large result sets streamed via `AsyncIterable<ResultChunk>` and bounded by `ResultRingBuffer` (max 200k rows) to prevent OOM.

6. **Quality Gate Verification**:
   - Every feature must pass `pnpm verify` (lint + typecheck across 19 packages + unit tests + app build) before completion.
