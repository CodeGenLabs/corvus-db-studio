# Testing Principles for Corvus DB Studio

1. **Test-Driven Development (TDD)**:
   - For every feature and bugfix, write or identify failing test cases before modifying implementation code.
   - Verify failure (RED), implement minimal code to pass (GREEN), then refactor cleanly (REFACTOR).

2. **Test Pyramid**:
   - **Unit Tests**: Pure functions, parsers, SQL generation, ring buffers, state transformations (`vitest`).
   - **Contract Tests**: Zod schema validation, RPC definition conformance, error redaction tests.
   - **Integration / Conformance Tests**: Driver SPI conformance suites across Postgres, MySQL, and SQLite (`testcontainers`).
   - **E2E Tests**: Electron desktop and web client UI interactions (`playwright`).

3. **Verification Before Claiming Success**:
   - Always run automated typechecks and tests before declaring tasks complete.
