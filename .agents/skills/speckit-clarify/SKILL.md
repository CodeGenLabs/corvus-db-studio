---
name: speckit-clarify
description: Use when resolving ambiguities, missing constraints, or NEEDS CLARIFICATION markers in an existing feature specification
---

# SpecKit: Clarify Specification

## Overview

The `speckit-clarify` skill systematically detects and resolves ambiguities in `specs/[feature]/spec.md` by asking up to 5 targeted, high-impact questions and writing the accepted answers directly back into the spec.

## Execution Workflow

1. **Scan Specification for Ambiguities**:
   - Locate `specs/[feature]/spec.md`.
   - Scan for `[NEEDS CLARIFICATION]` tags and unspecified high-impact areas:
     - Scope & boundaries (P1 MVP vs P2/P3 exclusions)
     - Security & permission rules
     - Performance / scalability limits
     - Error handling and offline / reconnection behavior

2. **Formulate Targeted Questions**:
   - Queue up to 5 highest-impact questions.
   - For each question:
     - Provide a recommended answer with brief reasoning.
     - Present clear multiple-choice options (A, B, C) in a Markdown table.
     - Ask one question at a time.

3. **Incorporate Clarifications into `spec.md`**:
   - Create or update `## Clarifications` section with `### Session YYYY-MM-DD`.
   - Record `- Q: <question> -> A: <selected option / answer>`.
   - Update corresponding sections in `spec.md` (Functional Requirements, Security, Data Model, Success Criteria) to replace vague wording.
   - Remove the resolved `[NEEDS CLARIFICATION]` markers.

4. **Report Completion**:
   - Summarize resolved points and suggest next step (`speckit-plan`).
