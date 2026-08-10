# Deterministic course checklist

- [ ] Approve the three challenge objectives, expected outputs, and foundations-first document order.
- [ ] Resolve the footer data source; repair build-page.js; prove second-generation byte identity.
- [ ] Reconcile README.md, PLAN.md, COURSE.md, and lessons/week0.md with tasks/course-spec.md.
- [ ] Add authored course data, author fixtures, and course-validate.mjs.
- [ ] Add the course map, real textarea editor, sandboxed runner, typed behavioral tests, feedback, hints, reset, and sequential unlock.
- [ ] Add versioned draft/progress persistence, URL navigation, stale-result handling, timeouts, output caps, and accessibility behavior.
- [ ] Extend demo-smoke.mjs, server.js --selftest, and CI for the complete coverage matrix.

## Verification checkpoint

- [ ] node --check app.js && node --check build-page.js && node --check server.js && node --check page-content.js
- [ ] node course-validate.mjs
- [ ] node server.js --selftest
- [ ] node demo-smoke.mjs
- [ ] node build-page.js twice produces byte-identical index.html

