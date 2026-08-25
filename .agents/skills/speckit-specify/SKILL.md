---
name: speckit-specify
description: Use when creating or updating a feature specification from a natural language feature description
---

# SpecKit: Specify Feature

## Overview

The `speckit-specify` skill generates a complete, structured, and technology-agnostic feature specification (`spec.md`) from a natural language user description.

## Execution Workflow

1. **Extract Keywords & Branch Name**:
   - Analyze user request and generate a 2-4 word short name (e.g., `004-query-caching` or `005-redis-driver`).
   - Create or locate feature folder: `specs/[###-feature-name]/`.

2. **Load Template**:
   - Read `.specify/templates/spec-template.md`.

3. **Draft Feature Specification**:
   - **User Scenarios & Priorities**:
     - Group into prioritized User Stories (P1 = MVP, P2, P3).
     - Each user story MUST be independently testable with Given/When/Then acceptance scenarios.
   - **Requirements**:
     - Numbered functional requirements (`FR-001`, `FR-002`...).
     - Security requirements (`SR-001`, `SR-002`...).
   - **Key Entities**:
     - Identify domain objects, fields, and relationships without technical implementation details.
   - **Success Criteria**:
     - Technology-agnostic, measurable outcomes (`SC-001`, `SC-002`...).
   - **Unclear Aspects**:
     - Make informed defaults where obvious.
     - Add at most 3 `[NEEDS CLARIFICATION: question]` markers for high-impact ambiguities.

4. **Quality Validation Checklist**:
   - Create `specs/[feature-name]/checklists/requirements.md` based on `.specify/templates/checklist-template.md`.
   - Ensure all quality items pass before proceeding.

5. **Write Artifact**:
   - Write content to `specs/[feature-name]/spec.md`.
   - Report completed spec path, branch name, and next suggested action (`speckit-clarify` or `speckit-plan`).
