# Deterministic course checklist

- [x] Approve the three challenge objectives, expected outputs, and foundations-first document order.
- [x] Resolve the footer data source; repair build-page.js; prove second-generation byte identity.
- [x] Reconcile README.md, PLAN.md, COURSE.md, and lessons/week0.md with tasks/course-spec.md.
- [x] Add authored course data, author fixtures, and course-validate.mjs.
- [x] Add the course map, real textarea editor, sandboxed runner, typed behavioral tests, feedback, hints, reset, and sequential unlock.
- [x] Add versioned draft/progress persistence, URL navigation, stale-result handling, timeouts, output caps, and accessibility behavior.
- [x] Extend demo-smoke.mjs, server.js --selftest, and CI for the complete coverage matrix.

## Verification checkpoint

- [x] node --check app.js && node --check build-page.js && node --check server.js && node --check page-content.js
- [x] node course-validate.mjs
- [x] node server.js --selftest
- [x] node demo-smoke.mjs
- [x] node build-page.js twice produces byte-identical index.html
