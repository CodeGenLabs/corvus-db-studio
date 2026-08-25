---
name: speckit-analyze
description: Use when checking consistency across specifications, architecture plans, data models, contracts, and implemented code
---

# SpecKit: Artifact Consistency Analysis

## Overview

The `speckit-analyze` skill performs bidirectional consistency analysis between `spec.md`, `plan.md`, `tasks.md`, `@corvus/contract`, and actual codebase implementations.

## Consistency Audit Points

1. **Spec ↔ Plan Consistency**:
   - Are all functional requirements (`FR-xxx`) in `spec.md` addressed in `plan.md`?
   - Are all user scenarios represented in the project structure?

2. **Plan ↔ Tasks Consistency**:
   - Do all components in `plan.md` have corresponding tasks in `tasks.md`?
   - Are task dependencies topologically valid?

3. **Tasks ↔ Code Consistency**:
   - Are all files specified in `tasks.md` present and implemented?
   - Do exported types and RPC methods match `@corvus/contract`?
