---
name: speckit-constitution
description: Use when establishing, updating, or verifying project-wide architectural principles, non-negotiables, and quality gates
---

# SpecKit: Project Constitution & Golden Rules

## Overview

The `speckit-constitution` skill manages project-wide non-negotiables, boundary constraints, and architectural standards recorded in `.specify/memory/constitution.md`.

## Enforcement Standards

1. **Non-Negotiables**:
   - `packages/ui` must **NEVER** import `node:*`, `electron`, `better-sqlite3`, `pg`, `mysql2`, or database drivers.
   - All mutations must pass through preview tokens.
   - Capability-based branching over driver ID hardcoding.
   - `pnpm verify` (lint + typecheck + test + build) must pass before merging.
