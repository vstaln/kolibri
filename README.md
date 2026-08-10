# Kolibri

An interactive programming course about the ideas underneath programming — and what those ideas let you do.

## What it is

Kolibri's tagline is **"Learn programming by solving a problem you already have."** Instead of syntax drills or video lectures, learners start from something small that already runs — a reminder that fires too late, a form that accepts the wrong thing, a tool that almost solves a real problem — and change it. The course treats AI as a normal part of modern programming: the assistant can explain a line, suggest an approach, or generate a draft, but every change appears in the editor where the learner can inspect, edit, and run it. The point is not to remember the example but to understand a concept well enough to use it somewhere the course didn't choose.

**How Kolibri teaches**

- Lessons start with a short explanation beside a runnable program. No videos.
- Learners change working systems, trace mistakes, and keep or reject what AI produces.
- Later lessons give less help: add a feature, fix a broken result, find the cause.
- The course ends in projects with a clear scope but no finished recipe. The learner decides how to build it, uses AI when it helps, and stays responsible for the code.
- The same idea returns later under another name, in another problem — Kolibri tests recognition and judgment, not syntax memory.

## Current state

- Public site: https://kolibrai.com
- Legacy URL: https://kolibri.alignment.id redirects to the public site.
- Working: curriculum direction, a three-stage lesson interface demo, and several experiments.
- Not built yet: the actual course content.
- The repo lives at https://github.com/vstaln/kolibri (was previously bundled inside the grayweb portfolio repo; that copy has been removed).

## Direction being explored

Hands-on lessons may run in the learner's own editor rather than a browser sandbox — e.g. Zed's agent panel with the learner's own API key or a fully local model. The site stays the content layer (lessons, exercises, verification checklists) and the learner's machine is where the agent works on real code, with every change reviewable as a real diff.

## Repo layout

- `index.html`, `styles.css`, `app.js` — the course site and lesson-demo interface
- `page-content.js` — lesson demo copy
- `build-page.js` — page build tooling
- `demo-smoke.mjs` — smoke test for the demo
- `server.js` — local dev server
- `deploy/`, `scripts/` — deployment and tooling
