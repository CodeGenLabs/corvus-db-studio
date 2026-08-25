# Tasks: [FEATURE NAME]

**Input**: Design documents from `specs/[###-feature-name]/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories)

## Format: `[ID] [P?] [Story] Description with exact file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Contracts

**Purpose**: Define RPC contracts, Zod schemas, and types in `@corvus/contract`.

- [ ] T001 Define RPC method and Zod schema in `packages/contract/src/define.ts`
- [ ] T002 Export types and update methods registry in `packages/contract/src/index.ts`

---

## Phase 2: Engine & Driver Implementation

**Purpose**: Implement engine handlers, SPI interfaces, and database drivers.

- [ ] T003 [P] Implement driver capability / query execution in `packages/driver-[engine]/src/...`
- [ ] T004 Implement engine handler with preview-token support in `packages/engine/src/...`

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

- [ ] T005 [P] [US1] Unit / integration test in `packages/[package]/src/__tests__/...`
- [ ] T006 [P] [US1] Create UI component in `packages/ui/src/components/...`
- [ ] T007 [US1] Connect component to RPC client in `packages/ui/src/views/...`

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

- [ ] T008 [P] [US2] Unit test in `packages/[package]/src/__tests__/...`
- [ ] T009 [US2] Implement feature enhancement in `packages/ui/src/...`

---

## Phase 5: Verification & Polish

**Purpose**: End-to-end verification, typecheck, lint, and build.

- [ ] T010 Run `npm run typecheck` across all 19 workspace packages
- [ ] T011 Run `npm run build` and `pnpm run build:app`
- [ ] T012 Run automated tests `pnpm test`
