# Kolibri

An interactive programming course about the ideas underneath programming — and what those ideas let you do. The foundations track teaches the way freeCodeCamp does: a short idea, a tiny challenge, a deterministic test, and clear feedback — then the next challenge unlocks.

## What it is

Kolibri's tagline is **"Learn programming by solving a problem you already have."** The foundations loop comes first: one short concept, one small starter program, and one exact behavioral check per challenge. You edit the code, run the tests, read the first failure or the pass message, fix or reset, and the next challenge unlocks. No account, no model call, no hidden grading rule, and no autoplay timer decides whether you passed.

The personal-project track comes later, after the foundations loop is proven. There, learners build a tool for a problem they actually have, with AI as a pair-programmer and the learner as the author — every AI-made change ends up in a review log. That interview-first workflow is deliberately not part of onboarding.

**The foundations loop**

1. Read a short explanation.
2. Edit a tiny starter program.
3. Run deterministic behavioral tests.
4. See the first concrete failure or the pass message.
5. Fix or reset.
6. Unlock the next challenge.

## Current state

- Public site: https://kolibrai.com
- Legacy URL: https://kolibri.alignment.id redirects to the public site.
- Working: the JavaScript Foundations preview — 3 challenges (Print a greeting, Update a count, Render a list) with an isolated sandboxed runner, draft persistence, sequential unlock, and accessible status/focus behavior.
- The three-stage lesson interface remains a separate read-only marketing demo.
- The interview-first course outline is archived under `COURSE.md` and `PLAN.md` as historical material for the later project track.
- The repo lives at https://github.com/vstaln/kolibri (was previously bundled inside the grayweb portfolio repo; that copy has been removed).

## Course contract

The canonical spec is `tasks/course-spec.md`: authored challenge descriptors, typed behavioral tests shared by the browser runner and the Node validator, monotonic mastery, and a strict zero-dependency verification gate. `course-validate.mjs` rejects duplicate IDs, broken prerequisites, passing starters, missing feedback, and reference solutions that fail.

## Repo layout

- `index.html`, `styles.css`, `app.js` — the course site and lesson-demo interface
- `page-content.js` — lesson demo copy
- `build-page.js` — page build tooling
- `course-content.mjs` — authored course hierarchy and challenge descriptors
- `course-state.mjs` — progress normalization and state machine
- `course-app.mjs` — course UI, sandboxed runner, persistence, and navigation
- `course-validate.mjs` — curriculum and fixture gate
- `course/` — author-only reference and wrong-answer fixtures
- `demo-smoke.mjs` — zero-dependency smoke for the marketing demo and the course flow
- `server.js` — local dev server
- `deploy/`, `scripts/` — deployment and tooling
