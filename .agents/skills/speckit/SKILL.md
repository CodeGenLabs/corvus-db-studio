---
name: speckit
description: Use when starting, planning, implementing, reviewing, or managing features using the full Specification-Driven Development (SpecKit) lifecycle
---

# SpecKit — Specification-Driven Development Framework

SpecKit is a structured engineering process that transforms natural language user requests into rigorously tested, architecture-compliant code through specification, planning, task decomposition, test-driven implementation, and multi-perspective code review.

## Lifecycle Overview

```
User Idea / Feature Request
            │
            ▼
┌─────────────────────────┐
│     speckit-specify     │  ▶ Generates spec.md from user description
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     speckit-clarify     │  ▶ Interactively resolves [NEEDS CLARIFICATION] tags (max 3-5 questions)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      speckit-plan       │  ▶ Produces plan.md, research.md, contracts/, data-model.md
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      speckit-tasks      │  ▶ Breaks plan into ordered, testable, dependency-mapped tasks.md
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│    speckit-implement    │  ▶ Executes tasks.md phase-by-phase using TDD (Red-Green-Refactor)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      speckit-review     │  ▶ 6-dimension code review (Style, Security, Complexity, Test, Arch, Logic)
└─────────────────────────┘
```

## Quick Reference: SpecKit Skills

| Skill | Trigger / When to Use | Key Artifacts |
|---|---|---|
| `speckit-specify` | When drafting a new feature specification or defining user scenarios and success criteria | `specs/[feature]/spec.md` |
| `speckit-clarify` | When detecting ambiguities, missing constraints, or `[NEEDS CLARIFICATION]` markers in `spec.md` | Updated `spec.md` (`## Clarifications`) |
| `speckit-plan` | When designing the technical architecture, data models, and RPC contracts for a specified feature | `plan.md`, `research.md`, `contracts/` |
| `speckit-tasks` | When decomposing an approved implementation plan into actionable, dependency-ordered tasks | `specs/[feature]/tasks.md` |
| `speckit-implement` | When systematically executing tasks from `tasks.md` following TDD and tracking task checkboxes | Implemented code & tests |
| `speckit-review` | When performing automated code review across style, security, complexity, architecture, and tests | Review report & quality gate score |
| `speckit-checklist` | When verifying specification completeness, security readiness, and architecture compliance | `checklists/requirements.md` |
| `speckit-analyze` | When inspecting project-wide consistency between specs, contracts, plans, and code | Consistency audit report |
| `speckit-constitution` | When defining or validating non-negotiable architecture rules, boundaries, and quality gates | `.specify/memory/constitution.md` |

## Core Principles in Corvus DB Studio

1. **Strict RPC Boundary**: `packages/ui` only communicates through RPC Client; 0 direct driver or Node imports.
2. **Capability Branching**: Never branch by `driverId`; branch strictly on `capabilities`.
3. **Preview-Token Guard**: All database write operations require preview generation and explicit user approval before execution.
4. **Independent User Stories**: Every user story must be an independently testable MVP slice.
