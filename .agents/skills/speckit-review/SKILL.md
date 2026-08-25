---
name: speckit-review
description: Use when performing comprehensive multi-perspective code reviews on branch diffs against specifications, architecture rules, security, and tests
---

# SpecKit: Multi-Perspective Code Review

## Overview

The `speckit-review` skill evaluates changes against specifications, monorepo boundaries, TypeScript strictness, security standards, and test coverage.

## Review Dimensions

1. **[STYLE & TYPE SAFETY]**:
   - No `any` or `as any` casting without explicit justification.
   - No `@ts-ignore` or `@ts-expect-error`.
   - Clean ESLint and Prettier compliance; no lingering `console.log`.

2. **[SECURITY]**:
   - Zero hardcoded secrets / API keys.
   - All RPC inputs validated with Zod schemas.
   - All DB mutations guarded by preview-tokens.
   - No XSS vulnerabilities (`dangerouslySetInnerHTML`).

3. **[ARCHITECTURE & MONOREPO CONSTRAINTS]**:
   - `packages/ui` only calls RPC Client; 0 node/electron/driver imports.
   - Capability-based branching; 0 hardcoded `driverId` switches.
   - Bounded streaming memory (`ResultRingBuffer` $\le$ 200k rows).

4. **[TEST COVERAGE]**:
   - Unit tests for pure functions / schemas / state reducers.
   - Conformance / integration tests for drivers.
   - Tests present for all new features and bugfixes.

5. **[LOGIC & ERROR HANDLING]**:
   - Proper `async/await` handling; no unhandled promise rejections.
   - Errors mapped to `CorvusError` with internationalized error keys.

## Review Report Output

```markdown
## SpecKit Code Review Report

**Result**: PASS / WARN / FAIL (Score: {N}/100)

| Category | Status | Findings | Severity |
|---|---|---|---|
| Style & Types | PASS/WARN/FAIL | {Count} | LOW |
| Security | PASS/WARN/FAIL | {Count} | CRITICAL |
| Architecture | PASS/WARN/FAIL | {Count} | CRITICAL |
| Test Coverage | PASS/WARN/FAIL | {Count} | MEDIUM |
| Logic & Errors | PASS/WARN/FAIL | {Count} | MEDIUM |

### Key Strengths
- ...

### Required Fixes
- [file:line]: Description of issue and recommended fix
```
