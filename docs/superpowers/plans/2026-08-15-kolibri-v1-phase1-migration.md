# Kolibri v1 — Phase 1: React + Tailwind + Vite Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Kolibri from zero-dependency vanilla JS to a Vite + React + Tailwind v4 app with a shadcn/ui + motion-primitives design system, preserving the landing page, waitlist, and the deterministic course preview (literacy floor) with identical behavior.

**Architecture:** A Vite SPA (`src/`) replaces `index.html` + `app.js` + `styles.css` + `build-page.js`. The pure, zero-dependency course modules (`course-content.mjs`, `course-evaluator.mjs`, `course-state.mjs`) are imported by React as-is — the "brain" is untouched. `server.js` stays the production server: it serves the built `dist/` and keeps `POST /api/waitlist`; it gains a `--dist` mode for serving `dist/`. CI builds with Vite, keeps the plain-node curriculum gate, and deploys `dist/` + `server.js`.

**Tech Stack:** Vite 7, React 19, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (MIT), motion-primitives (MIT, `motion`), Vitest + jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-08-15-kolibri-ai-teacher-design.md`

## Global Constraints

- Course brain modules (`course-content.mjs`, `course-evaluator.mjs`, `course-state.mjs`) stay **zero-dependency, unmodified** except where explicitly noted. No runtime imports of them may add dependencies.
- `course-validate.mjs` (curriculum gate) keeps running with plain `node` in CI — no npm deps.
- All UI must preserve the current behavior contract: challenge loop (starter code → run → deterministic test → pass/fail → unlock next), draft persistence, sequential unlock, accessible status/focus behavior.
- No account/auth. Progress in `localStorage` under the existing key `kolibri.progress.v1`.
- Waitlist endpoint contract unchanged: `POST /api/waitlist` → `{ ok: true } | 400 | 429 | 502 | 503`; rate limit RATE_LIMIT_MAX=5 per IP per RATE_LIMIT_WINDOW_MS.
- Vendored components from shadcn/ui and motion-primitives keep their MIT attribution headers. No scraped content. Nothing from `references/` (gitignored) ships to the public repo.
- Deploy still targets the existing bastion/origin flow; secrets stay in GitHub Actions vars/secrets.

---

## File Structure

```
kolibri/
├── index.html                 → REPLACE with Vite entry (root-level, Vite-compatible)
├── vite.config.js             → CREATE (react + tailwind plugins, vitest config)
├── package.json               → CREATE (first time in repo history)
├── components.json            → CREATE (shadcn config)
├── src/
│   ├── main.jsx               → CREATE (React root)
│   ├── App.jsx                → CREATE (router-less page switch: landing | course)
│   ├── index.css              → CREATE (Tailwind v4 entry + shadcn theme tokens)
│   ├── lib/utils.js           → CREATE (cn() helper, shadcn dependency)
│   ├── components/ui/         → shadcn components (generated)
│   ├── components/motion/     → motion-primitives components (generated)
│   ├── pages/Landing.jsx      → CREATE (ported landing content + waitlist form)
│   ├── pages/CourseMap.jsx    → CREATE (module → lesson → challenge tree)
│   ├── pages/Challenge.jsx    → CREATE (editor + sandboxed runner + tests UI)
│   ├── lib/course.js          → CREATE (React adapter over course modules: progress state, runner)
│   └── lib/api.js             → CREATE (fetch wrappers: waitlist)
├── course-content.mjs         → KEEP (imported by src/lib/course.js)
├── course-evaluator.mjs       → KEEP
├── course-state.mjs           → KEEP
├── course-validate.mjs        → KEEP (CI gate, plain node)
├── server.js                  → MODIFY (serve dist/ when present; keep waitlist + selftest)
├── build-page.js              → DELETE after landing port (Vite hashes assets)
├── app.js, styles.css, page-content.js → DELETE after ports complete
├── assets/                    → KEEP (hummingbird data files used by Landing port)
├── .github/workflows/ci-cd.yml → MODIFY (npm ci → vite build → validators → deploy dist/)
└── deploy/                    → KEEP
```

---

### Task 1: Scaffold Vite + React + Tailwind v4 + shadcn/ui + motion-primitives

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html` (entry), `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/lib/utils.js`, `components.json`, `.gitignore` entry for `node_modules`, `dist`

**Interfaces:**
- Consumes: nothing (repo has no package.json yet).
- Produces: `npm run dev` boots Vite; `npm run build` emits `dist/`; `npm test` runs Vitest.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "kolibri",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "motion": "^12.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "tailwindcss": "^4.1.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0",
    "jsdom": "^26.0.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true,
  },
});
```

- [ ] **Step 3: Create root `index.html` (Vite entry, replaces the old landing)**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kolibri — Learn AI by using it, and by building with it</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.jsx`, `src/App.jsx`, `src/index.css`, `src/lib/utils.js`, `src/test-setup.js`**

```jsx
// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```jsx
// src/App.jsx — temporary shell; Landing/CourseMap land in later tasks
export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Kolibri scaffold OK</h1>
    </main>
  );
}
```

```css
/* src/index.css — Tailwind v4 entry; theme tokens are expanded in Task 2 */
@import "tailwindcss";
```

```js
// src/lib/utils.js — shadcn dependency
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

```js
// src/test-setup.js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: `npm install`**

Run: `npm install`
Expected: installs cleanly; `package-lock.json` created.

- [ ] **Step 6: Add shadcn/ui (non-interactive)**

Run:
```bash
npx shadcn@latest init -y -b neutral
npx shadcn@latest add -y button input card dialog tabs badge tooltip label separator
```
Expected: `components.json` exists; `src/components/ui/*.tsx` created with MIT headers; `src/lib/utils` present. If the CLI requires interactivity flags that fail, fall back to manual setup: create `components.json` (see Task 2) and copy the component files from the shadcn registry with their license headers.

- [ ] **Step 7: Add motion-primitives components**

Run:
```bash
npx motion-primitives@latest add dialog in-view accordion magnetic infinite-slider scroll-progress
```
Expected: components land under `src/components/motion/` (or the CLI's configured path) with MIT headers.

- [ ] **Step 8: Verify build + dev + tests**

Run: `npm run build`
Expected: `dist/index.html`, `dist/assets/*` emitted; build exits 0.
Run: `npm test`
Expected: passes (no tests yet beyond setup).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html components.json src
git commit -m "feat: scaffold Vite + React + Tailwind v4 + shadcn + motion-primitives"
```

---

### Task 2: Theme tokens + base design system

**Files:**
- Modify: `src/index.css` (shadcn CSS variables for light/dark), `components.json`
- Create: `src/lib/theme.js` (design tokens: brand palette, radii, motion easings)

**Interfaces:**
- Consumes: Task 1 scaffold.
- Produces: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border` classes available app-wide; `theme` object with brand colors + motion easing tokens used by Landing/Challenge later.

- [ ] **Step 1: Apply the shadcn theme block in `src/index.css`**

Copy the Tailwind v4 `@theme inline` + `:root`/`.dark` variable block from the shadcn docs (neutral base, as chosen in Task 1). Confirm `@import "tailwindcss"` stays first, then `@theme inline { --color-background: ... }` etc.

- [ ] **Step 2: Add Kolibri brand tokens to the theme**

```css
/* in src/index.css, inside @theme inline */
--color-brand: oklch(0.65 0.2 255);       /* Kolibri blue */
--color-brand-strong: oklch(0.55 0.22 255);
--color-accent-ai: oklch(0.7 0.18 155);    /* "AI teacher" green, used for AI feedback */
--radius: 0.75rem;
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

- [ ] **Step 3: Smoke-test the tokens**

Run: `npm run dev` and confirm a component using `className="bg-brand text-white"` renders. (Temporary button on App.jsx is acceptable; remove in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add src/index.css components.json
git commit -m "feat: theme tokens and design system base"
```

---

### Task 3: Course engine adapter (`src/lib/course.js`) + tests

**Files:**
- Create: `src/lib/course.js`, `src/lib/course.test.js`

**Interfaces:**
- Consumes: `course-content.mjs` (`course`), `course-state.mjs` (`PROGRESS_KEY`, `createProgress`, `normalizeProgress`, `deriveChallengeState`, `orderedChallenges`, `isComplete`, `STATES`, `MAX_CODE_BYTES`), `course-evaluator.mjs` (`evaluateTests`).
- Produces:
  - `loadProgress(): Progress` — reads `localStorage[PROGRESS_KEY]`, runs `normalizeProgress(course, parsed)`.
  - `saveProgress(progress): void` — writes JSON under `PROGRESS_KEY`.
  - `createSandboxRunner(challenge)` — returns an object `{ run(code): Promise<RunResult>, dispose(): void }`; `run` posts a message to a sandboxed `iframe` and resolves with a validated result; must reuse the existing `createRunnerDocument` from `course-app.mjs` (ported verbatim into this file) and `isValidResult`.
  - `RunResult = { ok: boolean, checks: Array<{id, pass, actual, expected, message}>, error: null | {name, message} }`
  - `advance(progress, passedChallengeId)` — marks passed, unlocks next, returns new progress (mutable clone).

- [ ] **Step 1: Write failing tests (`src/lib/course.test.js`)**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { course } from '../../course-content.mjs';
import { PROGRESS_KEY, createProgress, STATES } from '../../course-state.mjs';
import { loadProgress, saveProgress, advance } from './course.js';

describe('course progress', () => {
  beforeEach(() => localStorage.clear());

  it('loadProgress returns a valid fresh progress when storage is empty', () => {
    const p = loadProgress();
    expect(p.courseId).toBe(course.id);
    expect(p.currentChallengeId).toBe('js-foundations-m01-l01-c01');
  });

  it('loadProgress normalizes corrupted storage', () => {
    localStorage.setItem(PROGRESS_KEY, 'not json');
    const p = loadProgress();
    expect(p.passedIds).toEqual([]);
  });

  it('advance marks the first challenge passed and unlocks the second', () => {
    const fresh = createProgress(course);
    const next = advance(fresh, 'js-foundations-m01-l01-c01');
    expect(next.passedIds).toContain('js-foundations-m01-l01-c01');
    expect(next.currentChallengeId).toBe('js-foundations-m01-l01-c02');
  });

  it('saveProgress round-trips through loadProgress', () => {
    const fresh = createProgress(course);
    saveProgress(fresh);
    expect(loadProgress()).toEqual(fresh);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `./course.js` module not found.

- [ ] **Step 3: Implement `src/lib/course.js`**

Port `createRunnerDocument`, `isValidResult`, and the sandbox-run logic from `course-app.mjs:24-191` verbatim (they are pure/browser-safe), then implement `loadProgress`, `saveProgress`, `createSandboxRunner`, `advance` per the Interfaces block. `advance` copies the progress, appends `passedChallengeId` to `passedIds` (only if it is the next sequential challenge, matching `normalizeProgress`'s monotonic rule), and sets `currentChallengeId` to the first incomplete challenge.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/course.js src/lib/course.test.js
git commit -m "feat: course engine adapter with progress and sandboxed runner"
```

---

### Task 4: Challenge view (literacy floor UI)

**Files:**
- Create: `src/pages/Challenge.jsx`, `src/pages/Challenge.test.jsx`
- Modify: `src/App.jsx` (route to Challenge when `#/challenge/:id` — hash routing, no router dep)

**Interfaces:**
- Consumes: Task 3 (`createSandboxRunner`, `loadProgress`, `saveProgress`, `advance`), shadcn `Button`, `Card`, `Tabs`, `Tooltip`, `Textarea`, motion-primitives `InView`.
- Produces: `Challenge({ challengeId, onExit })` — renders instruction/explanation, editor, Run/Reset, tests result list, hints (nudge/direction/walkthrough), completion state. Behavior contract (must match current site): sequential unlock (LOCKED shows lock + prerequisite), draft autosave to `progress.drafts`, PASSED shows the challenge's `feedback.pass`, failed tests show `test.failure` messages and first failure first, next challenge unlocks on pass.

- [ ] **Step 1: Write the component test (`src/pages/Challenge.test.jsx`)** — stub the runner with a fake that returns a deterministic `RunResult`; assert: (a) run button disabled before code is entered and while running, (b) a failing result renders the failure message, (c) a passing result renders `feedback.pass` and enables next, (d) locked challenge renders lock message and no editor.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `Challenge.jsx`** porting the behavior from `course-app.mjs` `initCourse()` (`course-app.mjs:193-407`): map each DOM hook (`course-editor`, `course-run`, `course-reset`, `course-feedback`, `course-hints`, `course-next`, `course-map`, `course-completion`) to React state/JSX. Use `InView` for section reveals, `Card` for the tests panel, `Tabs` for Console/Preview. Drafts save to `progress.drafts[challengeId]` on change (debounced 300ms).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Manual parity check** — `npm run dev`, open `#/challenge/js-foundations-m01-l01-c01`, verify: starter code loads, run produces the exact `Hello, Ada` console check, reset restores starter, passing unlocks c02.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Challenge.jsx src/pages/Challenge.test.jsx src/App.jsx
git commit -m "feat: challenge view (literacy floor) with sandboxed runner"
```

---

### Task 5: Course map + landing page ports

**Files:**
- Create: `src/pages/CourseMap.jsx`, `src/pages/Landing.jsx`, `src/lib/api.js`, `src/pages/Landing.test.jsx`
- Modify: `src/App.jsx` (hash routes: `#/` → Landing, `#/course` → CourseMap, `#/challenge/:id` → Challenge)
- Delete: after this task, `app.js`, `page-content.js`, `styles.css`, `build-page.js` are retired from the build (delete only after verification).

**Interfaces:**
- Consumes: `course` (content), progress from Task 3; `api.js` exposes `submitWaitlist(email): Promise<{ok:true}>` that POSTs JSON to `/api/waitlist` and throws `{status, message}` on non-200 (matching current 400/429/502/503 semantics).
- Produces: Landing with hero copy (must include "Learn programming by solving a problem you already have."), concepts section ("AI can write the code."), the moire canvas visual, waitlist form wired to `submitWaitlist`, lesson demo copy (from `page-content.js` — ported content, not file). CourseMap renders module → lesson → challenge tree with PASSED/READY/LOCKED states from `deriveChallengeState`.

- [ ] **Step 1: Write `Landing.test.jsx`** — mock `fetch`; assert: (a) waitlist submit with valid email POSTs JSON and shows success, (b) 429 response shows the rate-limit message, (c) invalid email shows inline validation without fetching.

- [ ] **Step 2: Implement `api.js`, `Landing.jsx`, `CourseMap.jsx`, wire routes in `App.jsx`.** Port copy/markup from the old `index.html` + `app.js` (hummingbird assets keep their `?v=` versioning handled by Vite hashing; port the `initMoireWebGL` logic into a `useMoire` hook or a `<MoireCanvas/>` component).

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Manual parity check** — `npm run dev`: landing renders hero + waitlist; submitting an email against `node server.js` (which still serves the OLD build at `/` for now) — use Vite proxy or `npm run preview` after a build to hit the real API. Verify course map shows 3 challenges, first READY, rest LOCKED, progress persists across reload.

- [ ] **Step 5: Delete retired files** — `app.js`, `page-content.js`, `styles.css`, `build-page.js` (after confirming no imports reference them and the build passes).

- [ ] **Step 6: Commit**

```bash
git add src/pages src/lib/api.js src/App.jsx
git rm app.js page-content.js styles.css build-page.js
git commit -m "feat: port landing and course map to React; retire vanilla frontend"
```

---

### Task 6: Server `dist/` serving + CI/CD

**Files:**
- Modify: `server.js` (`serveStatic` root resolution + selftest additions), `.github/workflows/ci-cd.yml`, `deploy/kolibri-deploy.sh` (if it references the old build)

**Interfaces:**
- Consumes: Task 5 output (`dist/`).
- Produces: production server that serves `dist/` when it exists (falling back to repo-root static files during dev), same waitlist API, `node server.js --selftest` green in CI.

- [ ] **Step 1: Modify `server.js`** — resolve the static root to `dist/` when `fs.existsSync(ROOT/dist/index.html)` is true, else `ROOT`. Add selftest asserts: `dist/index.html` exists after build, and `dist/index.html` contains `id="root"` and references `/assets/` (Vite hashing) — keep the existing waitlist/hero assertions only when serving the legacy root (they will fail against `dist/`; make the hero assertions conditional on legacy mode or update the strings in the React port to match).

- [ ] **Step 2: Update CI (`ci-cd.yml`)** — replace the `node --check` loop and `demo-smoke.mjs` invocation with: `npm ci`, `npm run build`, `npm test`, `node course-validate.mjs`, `node server.js --selftest`. Keep the deploy job: rsync now ships `dist/` + `server.js` + `deploy/` + `course-*.mjs` + `course-validate.mjs` (the runner does not need the source `.mjs` at runtime unless the selftest asserts them — assert only what ships).

- [ ] **Step 3: Update `deploy/kolibri-deploy.sh`** if it installs or runs anything build-related; the build now runs on the CI runner, so the deploy step only syncs artifacts. Verify the systemd service still runs `node server.js`.

- [ ] **Step 4: Verify locally** — `npm run build && node server.js --selftest && node server.js &` then `curl -I localhost:3001/` → 200 with the SPA; `curl -X POST localhost:3001/api/waitlist -d 'email=a@b.co'` → expected 503 (no webhook) or 200 (if env set).

- [ ] **Step 5: Commit + let CI deploy**

```bash
git add server.js .github/workflows/ci-cd.yml deploy/kolibri-deploy.sh
git commit -m "ci: build with Vite, serve dist, keep curriculum gate"
git push origin main
```

Expected: GitHub Actions runs; quality job green; deploy job pushes `dist/` and the curl gate (`https://kolibrai.com/` → redirect) passes.

---

### Task 7: Phase 1 acceptance

- [ ] **Step 1: Acceptance checklist** — (a) `npm run build` clean, (b) `npm test` green, (c) `node course-validate.mjs` green, (d) `node server.js --selftest` green, (e) production site serves the React app at `/`, waitlist works, `#/course` shows the 3-challenge literacy floor with correct unlock behavior, (f) git history contains no `references/`, `research/`, `.pi/`, `.serena/`, `.agents/`, `.claude/`, or `.env` files.
- [ ] **Step 2: Record result** — update this plan's checkbox states and note any deviations in `docs/superpowers/plans/` (no separate file needed; edit this one).
