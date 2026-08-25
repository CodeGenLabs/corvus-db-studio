---
name: speckit-tasks
description: Use when breaking down an implementation plan into ordered, executable, dependency-mapped tasks
---

# SpecKit: Task Decomposition

## Overview

The `speckit-tasks` skill converts `plan.md` and `spec.md` into an actionable, dependency-ordered `tasks.md` where each task is concrete, testable, and tagged with exact file paths.

## Execution Workflow

1. **Load Artifacts**:
   - Read `specs/[feature]/plan.md` and `specs/[feature]/spec.md`.
   - Read `.specify/templates/tasks-template.md`.

2. **Structure Task Phases**:
   - **Phase 1: Setup & Contracts**: Core schemas, types in `@corvus/contract`.
   - **Phase 2: Foundational Engine / Driver**: Backend handlers, driver SPI implementations.
   - **Phase 3: User Story 1 (P1 - MVP)**: End-to-end slice for highest priority journey.
   - **Phase 4+: User Stories 2, 3...**: Additional increments.
   - **Final Phase: Verification & Quality Gates**: Typecheck, lint, build, unit/e2e tests.

3. **Checklist Task Format (MANDATORY)**:
   Every task must follow:
   ```text
   - [ ] [TaskID] [P?] [Story?] Description with exact file path
   ```
   - `[TaskID]`: Sequential identifier (e.g., `T001`, `T002`).
   - `[P]`: Marked only if parallelizable without shared state.
   - `[Story]`: User story tag for story phases (`[US1]`, `[US2]`).
   - `Description`: Clear verb + exact file path (`packages/ui/src/...`, `packages/engine/src/...`).

4. **Output & Summary**:
   - Write to `specs/[feature]/tasks.md`.
   - Report task count, parallel execution opportunities, and MVP scope.
   - Suggest next step (`speckit-implement`).
