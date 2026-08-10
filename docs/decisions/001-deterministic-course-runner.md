# ADR-001: Use an authored deterministic challenge runner

## Status

Proposed

## Context

The current lesson interface is a scripted marketing demo: it renders a read-only pre, advances with timers, and uses hardcoded example states. A real course needs repeatable pass/fail behavior, ordered progression, draft recovery, and safe execution of learner code without adding a server or hiding grading rules behind an opaque service.

## Decision

- Model the course as authored Track → Course → Module → Lesson → Challenge data with stable IDs.
- Define tests as typed behavioral descriptors and validate them against author fixtures before the browser build.
- Execute code in a fresh sandbox="allow-scripts" iframe with restrictive CSP, bounded input/output/time, and strict postMessage run IDs.
- Persist only versioned local progress and drafts; derive all UI state from authored content plus validated progress.
- Keep the existing scripted lesson demo separate from the graded course runtime.

## Alternatives considered

### Keep the scripted demo

Rejected: it demonstrates the idea but cannot accept arbitrary learner code or prove progression.

### Grade source text in the parent page

Rejected: source matching is brittle, unsafe, and rejects valid implementations.

### Put progress and grading on the server

Deferred: it adds accounts, persistence, privacy, and availability dependencies before the first lesson is validated.

## Consequences

- The first implementation needs a small authored-content validator and runner smoke suite.
- Tests are transparent and behavioral; this is a learning product, not a secure certification system.
- Browser sandbox limits and timeout replacement become part of the permanent runtime contract.
- The older project-first course documents must be reconciled before implementation so future edits have one source of truth.

