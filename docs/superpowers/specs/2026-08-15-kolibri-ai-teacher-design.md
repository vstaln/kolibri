# Kolibri 2.0 — AI Teacher, Design Spec

**Date:** 2026-08-15
**Status:** Approved design, awaiting implementation plan
**Path:** Architectural (new product built on the existing Kolibri repo)

## 1. Vision

Kolibri teaches people to use AI — and to build with it. Tagline: **"Learn AI by using it, and by building with it."**

One ladder, two tracks:

- **Track 1 — AI 101 (use AI).** For normal people, zero code. Teaches what AI assistants are, how to get great results from them, and how to use them in life and work. Structured on the Anthropic Claude 101 skeleton (module → lesson with objectives, est. time, roadmap, certificate) but tool-agnostic and with original content.
- **Track 2 — Build with AI.** A literacy floor of deterministic coding challenges (scaled up from the existing 3-challenge preview), then the project track: **the AI writes all the code, the learner reviews every diff and stays the author.** The proof is a review log where the learner explains each AI-made change.

**The design principle (user-confirmed):** it is fine for AI to write all the code — that is how the industry works now, Anthropic included. What learners must gain is *understanding*: the ability to read, review, verify, and own. The "prove it worked" moment is not "write from scratch" — it is **"explain this AI-written code back."**

**The moat:** the AI is both the subject and the teacher. Deterministic tests grade code; AI feedback grades open-ended work (prompts, explanations). Khan Academy and freeCodeCamp have deterministic loops but no AI feedback; commercial courses are paywalled and passive.

## 2. Grading model (hybrid)

| Work type | Grader | Cost | Never unfair? |
|---|---|---|---|
| Code challenges (literacy floor) | Existing deterministic evaluator (`course-evaluator.mjs`) | zero | yes |
| Prompts, explanations, reviews (AI 101, project track) | `/api/grade` — LLM with a hidden rubric | per-call | no (rubric designed to be as fair as possible) |

`/api/grade` flow: learner submits work → server attaches the lesson's rubric + grading instructions → LLM returns `{ verdict: pass | revise, feedback, hints? }` → learner iterates until pass. Rate-limited per lesson and per IP to control cost.

## 3. Course structure (Claude 101 skeleton)

Content model — a course is modules; a module is lessons:

```
Course
├── Module { id, title, blurb, icon }
│   ├── Lesson { id, moduleId, title, type: concept|practice|project,
│   │            estMinutes, objectives: string[], content: blocks[],
│   │            exercise?: { kind: deterministic|ai, ... }, roadmap?: string }
│   └── ...
├── Certificate { criteria, shareable }
```

Lesson page anatomy (mirrors Claude 101, verified against captures):
title → **estimated time** → **"By the end of this lesson you'll be able to…"** (3–4 objectives) → content (text/video/code blocks) → **exercise** → unlock next. Sidebar shows the module/lesson list with progress state. Certificate of completion at the end, shareable.

### AI 101 curriculum (Track 1, v1 content)

| Module | Lessons (draft) |
|---|---|
| M1 Meet AI assistants | What is an AI assistant? · What it can and can't do · Hallucinations & when to distrust · Privacy basics |
| M2 Getting great results | Context is everything · Be specific, give constraints · Iterate: refine, don't restart · Give it a role |
| M3 AI in your life | Writing & editing · Research & summarizing · Planning & organizing · Images & creative |
| M4 AI at work | Use-cases by role (writing, engineering, ops, sales) · Where AI doesn't belong |
| M5 Conclusion & certificate | What's next · Certificate of completion |

Each AI 101 lesson's exercise is `kind: ai` (write a prompt/answer; the teacher grades it).

### Literacy floor (Track 2, v1 = port existing)

Port the existing deterministic challenges (Print a greeting, Update a count, Render a list) into the React app unchanged in behavior — same content, same evaluator, same sandboxed runner. This is the *review literacy* seed: enough to read a diff.

## 4. Architecture

**Stack (approved):** Vite + React + Tailwind v4 (`@tailwindcss/vite`) + Framer Motion (`motion`). reactbits + motion-primitives (MIT) for animated components.

```
kolibri/
├── index.html               → replaced by Vite entry
├── src/                     (new)
│   ├── main.jsx, App.jsx
│   ├── pages/  Landing, CourseMap, Lesson, Challenge, Certificate
│   ├── components/  LessonShell, ExerciseAI, ExerciseCode, ProgressSidebar, CertificateView
│   ├── lib/  api.js (waitlist + /api/grade), progress.js (localStorage), grade.js (rubric client)
│   └── styles/  Tailwind entry
├── course-content.mjs       keep as-is (pure data, imported by React)
├── course-evaluator.mjs     keep as-is (pure logic)
├── course-state.mjs         keep as-is (pure logic)
├── course-validate.mjs      keep as-is (curriculum gate, runs in CI with plain node)
├── server.js                keep + add POST /api/grade
└── dist/                    Vite build output (deployed)
```

- **The course brain stays pure and zero-dependency.** React imports the existing `.mjs` modules directly. This preserves the "no hidden grading rules" promise and keeps `course-validate.mjs` runnable with plain node in CI.
- **Sandboxed runner:** keep the iframe-srcdoc isolation pattern for code challenges (port from `course-app.mjs`).
- **Persistence:** localStorage, **no account** (open-source philosophy). Review log export comes with the project track (out of v1 scope).
- **Server (`server.js`):** keeps static serving + `POST /api/waitlist`; adds `POST /api/grade`:
  - reads `{ lessonId, submission }`, looks up the lesson's rubric, calls the LLM, returns the verdict.
  - LLM client is provider-swappable; **default: Anthropic Claude** (user's lane). Key from `process.env.ANTHROPIC_API_KEY` (never in the repo).
  - Rate limits: per-lesson token budget + per-IP cap (env-configurable).
- **`build-page.js` is retired** — Vite content-hashes assets natively (replaces the Cloudflare cache-busting hack).

## 5. Design system

Tailwind-based. Animated components from motion-primitives/reactbits (MIT, attribution kept). Visual language inspired by the references in `references/` (gitignored): Claude 101 lesson anatomy, fCC challenge layout (left instructions / right editor / tests below), Khan progress affordances (practiced → mastered). No copied assets or content from any reference site.

## 6. Migration & deployment

1. Scaffold Vite + React + Tailwind + motion (`package.json`, `vite.config.js`, `src/`).
2. Port the challenge UI (editor + sandboxed runner + tests) to React.
3. Port the landing page (waitlist form intact — `POST /api/waitlist` unchanged).
4. Build the AI 101 track shell (course map, lesson page, AI exercise component).
5. Author M1–M2 content (AI-drafted, human-reviewed, original).
6. Update CI/CD:
   - `npm ci` → `npm run build` → `node course-validate.mjs` → `node server.js --selftest` → `node demo-smoke.mjs` (adapt smoke to the new entry)
   - Deploy: build on the runner, rsync `dist/` + `server.js` + config, keep the existing bastion/origin flow and secrets.
7. Verify: build passes, selftest passes, site serves, `POST /api/grade` returns verdicts on the review box (staging), production smoke check via the existing curl gate.

## 7. Scope

**In v1:** migration to React+Tailwind+Vite · port of landing + literacy floor · AI 101 track: **M1–M2 fully authored** (lessons with objectives, est. time, content, gradeable AI exercises) · M3–M5 appear in the course map as locked "coming soon" modules (no lesson objects — the map shows the full path without shipping half-authored lessons) · `/api/grade` with Claude · no-account progress.

**Explicitly out of v1:** Track 2 project track (diff review, review log export) · accounts/auth · payments/certificates-of-payment · video production (text-first lessons) · i18n.

## 8. Verification & quality bar

- `course-validate.mjs` still rejects duplicate IDs, broken prerequisites, passing starters, missing feedback, failing reference solutions — unchanged.
- Every lesson must have objectives + est. time + exercise; every exercise must be gradeable (deterministic or AI rubric present).
- `npm run build` must pass clean; CI must be green before merge; deploy must pass the production curl gate.

## 9. Decisions recorded

1. AI teacher default = Anthropic Claude; provider-swappable behind one client interface. (User's lane: Claude 101, Manus, Anthropic courses.)
2. v1 scope = migration + Track 1 + literacy floor port; project track next milestone. (User-approved.)
3. No account, ever; progress in localStorage. (User-approved.)
4. Content is original: AI-drafted, human-reviewed. Structure (not content) borrowed from Claude 101 — structure is not copyrightable; all lesson text is ours. No scraped or pirated content, ever. (User-approved.)

## 10. Phasing note

The implementation plan phases this work: **Phase 1 — migration** (scaffold, port landing + literacy floor, CI/CD), **Phase 2 — AI 101 shell + content** (course map, lesson page, M1–M2 authored), **Phase 3 — `/api/grade`** (LLM client, rubric engine, rate limits, selftest coverage). Each phase ends green (build + validators + deploy smoke).
