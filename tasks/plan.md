# Implementation Plan: Deterministic JavaScript Foundations

The canonical contract is tasks/course-spec.md. Implement in dependency order; do not code against the older project-first docs until they are reconciled with the spec.

## Phase 0: Resolve source-of-truth conflicts

- Approve the first three challenge objectives and exact outputs.
- Choose a repository-local footer data source and repair build-page.js; prove the generator is byte-identical on its second run.
- Reconcile README.md, PLAN.md, COURSE.md, and lessons/week0.md so the foundations-first order is unambiguous.

## Phase 1: Authored curriculum contract

- Add the stable hierarchy and three challenge descriptors.
- Add author-only reference/wrong-answer fixtures.
- Add course-validate.mjs for IDs, prerequisites, glossary terms, starter failure, feedback/hint completeness, behavioral fixtures, content reachability, coverage-matrix completeness, and content-hash correctness.
- Keep one typed test-descriptor interpreter shared by the browser runner and Node validator.

## Phase 2: One vertical learner slice

- Add the course map and first lesson shell.
- Add the labeled textarea, isolated runner, exact result schema, deterministic feedback, hints, reset, and sequential unlock.
- Keep the existing marketing demo separate and unchanged.

## Phase 3: Persistence, navigation, and hardening

- Add versioned progress/draft persistence with corrupt/storage-failure fallback.
- Add URL hash navigation, stale-result rejection, exact timeout/output limits, accessibility focus/status behavior, and mobile layout.

## Phase 4: Verification gate

- Extend demo-smoke.mjs for every state/error/security/accessibility case in the spec.
- Update server.js --selftest and CI for the curriculum validator, generated-page hash correctness, and idempotent build.
- Run all repository checks before implementation is considered complete.

## Checkpoints

- After Phase 1: validator passes the authored course and rejects deliberately malformed fixtures.
- After Phase 2: a learner can fail, fix, pass, reset, and unlock the three challenges locally.
- After Phase 3: reload, back/forward, storage failure, stale results, timeout, and keyboard/mobile paths are covered.
- Final: generated output is reproducible and all CI checks pass.
