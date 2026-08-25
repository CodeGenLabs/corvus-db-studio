---
name: speckit-implement
description: Use when systematically executing tasks from tasks.md following Test-Driven Development and updating task completion status
---

# SpecKit: Systematic Implementation

## Overview

The `speckit-implement` skill executes the task list defined in `specs/[feature]/tasks.md` phase-by-phase, enforcing TDD (Red-Green-Refactor) and maintaining checkbox state.

## Execution Workflow

1. **Verify Prerequisites & Checklists**:
   - Read `specs/[feature]/tasks.md`.
   - Verify `checklists/requirements.md` has no blocking failures.

2. **Phase-by-Phase Execution**:
   - Process tasks strictly in dependency order.
   - For parallel tasks (`[P]`), dispatch or run without inter-task interference.
   - For code modifications:
     - Follow TDD: write/identify tests first (Red), implement code (Green), refactor (Refactor).
     - Respect Monorepo boundaries (no direct driver/node imports in UI; preview-tokens for all DB mutations).

3. **Checkbox Progress Tracking**:
   - Immediately mark completed tasks as `- [X]` in `specs/[feature]/tasks.md`.
   - Never leave completed tasks unmarked.

4. **Continuous Quality Check**:
   - Run typecheck and tests after major milestones:
     ```bash
     npm run typecheck
     pnpm test
     ```

5. **Completion Validation**:
   - Confirm all tasks in `tasks.md` are marked `[X]`.
   - Run final build verification:
     ```bash
     npm run build
     pnpm run build:app
     ```
   - Suggest next step (`speckit-review`).
