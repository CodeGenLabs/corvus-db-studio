# Specification & Architecture Quality Checklist: [FEATURE NAME]

**Purpose**: Validate specification completeness and architecture alignment before implementation  
**Feature**: `specs/[###-feature-name]/spec.md`

## Content Quality & Completeness

- [ ] No implementation details leaked into user requirements
- [ ] Focused on user value and business needs
- [ ] All mandatory sections completed (Scenarios, Requirements, Success Criteria)
- [ ] No unresolved `[NEEDS CLARIFICATION]` tags remain

## Architecture & Monorepo Constraints

- [ ] `packages/ui` uses ONLY RPC Client calls; 0 direct node/electron/driver imports
- [ ] Feature branches on `capabilities` rather than hardcoded driver IDs
- [ ] All mutating/DDL/DML operations require preview-token
- [ ] Large streaming results utilize `ResultRingBuffer` with bounded memory
- [ ] Full type safety enforced via `@corvus/contract` Zod schemas

## Testability & Acceptance Criteria

- [ ] All functional requirements have unambiguous, testable acceptance criteria
- [ ] Primary user journeys and MVP slice clearly defined
- [ ] Edge cases and offline/reconnect failure modes specified
- [ ] Success criteria are measurable and verifiable
