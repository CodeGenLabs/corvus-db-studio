# Implementation Plan: [FEATURE NAME]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link to spec.md]
**Input**: Feature specification from `specs/[###-feature-name]/spec.md`

## Summary

[Extract from feature spec: primary requirement + technical approach and architecture design]

## Technical Context

**Monorepo Packages Affected**: [e.g., `@corvus/ui`, `@corvus/engine`, `@corvus/contract`, `@corvus/driver-core`, `@corvus/sql`]  
**Language/Version**: TypeScript 5.8+, Node.js 22+  
**Primary Frameworks**: React 19, Fastify (Web), Electron (Desktop), Tailwind CSS  
**Testing Framework**: Vitest, Playwright (E2E)  
**Security & Constraints**: Preview-token required for mutations; UI package must NEVER import Node/Electron/Driver modules directly.

## Constitution & Architecture Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **Rule 1 (UI Boundary)**: `packages/ui` only calls RPC Client; no `node:*` or driver imports.
- [ ] **Rule 2 (Capabilities)**: Feature branches by `capabilities` rather than hardcoded `driverId`.
- [ ] **Rule 3 (Preview Token)**: All database write actions generate SQL preview before execution.
- [ ] **Rule 4 (Type Safety)**: Contract schemas defined in `@corvus/contract` with Zod validation.
- [ ] **Rule 5 (Verification)**: `pnpm verify` (lint + typecheck + test + build) must pass cleanly.

## Project Structure & Affected Modules

```text
specs/[###-feature]/
├── spec.md              # Feature specification
├── plan.md              # This plan
├── research.md          # Research findings and decisions
├── data-model.md        # Entities and schemas
└── tasks.md             # Ordered executable tasks
```

### Affected Source Files

```text
packages/contract/src/...    # RPC methods & Zod schemas
packages/engine/src/...      # Engine handlers & SPI
packages/driver-*/src/...    # DB drivers (PG / MySQL / SQLite)
packages/ui/src/...          # React components, views & stores
```

## Security & Risk Mitigation

| Threat / Risk | Impact | Mitigation |
|---|---|---|
| SQL Injection / Unsafe Execution | Critical | Parameterized queries + preview-token guard |
| Memory Leak on Large Datasets | High | ResultRingBuffer (200k max limit) + streaming AsyncIterable |
| Connection Loss / Timeout | Medium | ConnectionLostBanner + auto-reconnect |
