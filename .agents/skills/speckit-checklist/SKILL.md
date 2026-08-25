---
name: speckit-checklist
description: Use when generating or validating quality checklists for feature specifications, architecture compliance, or deployment readiness
---

# SpecKit: Quality Checklist Management

## Overview

The `speckit-checklist` skill produces and validates domain-specific checklists (`specs/[feature]/checklists/requirements.md`) to verify that all functional requirements, security constraints, and architecture rules are fulfilled before and after implementation.

## Checklist Evaluation Flow

1. **Load Checklist**:
   - Locate `specs/[feature]/checklists/requirements.md` (or generate from `.specify/templates/checklist-template.md`).

2. **Evaluate Status**:
   - Count completed items (`- [X]`) vs incomplete items (`- [ ]`).
   - If any incomplete items exist, highlight gaps to the user before planning or deployment.

3. **Validate Monorepo Invariants**:
   - Check UI RPC boundary, preview-token pattern, capability branching, and test coverage.
