---
name: speckit-plan
description: Use when designing technical architecture, monorepo package impact, data models, and RPC contracts for an approved feature specification
---

# SpecKit: Technical Implementation Planning

## Overview

The `speckit-plan` skill translates `spec.md` into concrete architecture plans (`plan.md`), research artifacts (`research.md`), data model schemas (`data-model.md`), and RPC contract definitions (`contracts/`).

## Execution Workflow

1. **Load Context & Constitution**:
   - Read `specs/[feature]/spec.md`.
   - Read `.specify/memory/constitution.md`.
   - Read `.specify/templates/plan-template.md`.

2. **Phase 0: Technical Research & Decisions**:
   - Evaluate dependencies, performance trade-offs, and state management.
   - Record findings in `specs/[feature]/research.md` (Decision, Rationale, Alternatives Considered).

3. **Phase 1: Architecture, Contracts & Data Model**:
   - **Data Model**: Extract entities, Zod validation schemas, and relationships into `specs/[feature]/data-model.md`.
   - **RPC Contracts**: Define methods (Unary/Stream), request/response schemas, and audit levels under `specs/[feature]/contracts/`.
   - **Monorepo Boundaries**: Ensure UI package interacts only via RPC Client; verify preview-token mechanism for write operations.

4. **Constitution Check**:
   - Verify non-negotiable rules (RPC boundary, capability branching, preview token, 0 external font calls).

5. **Generate `plan.md`**:
   - Populate `specs/[feature]/plan.md` using the template.
   - Report generated artifacts and suggest next step (`speckit-tasks`).
