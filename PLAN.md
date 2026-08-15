# Kolibri — Detailed Course Plan

> **Historical (pre-foundations).** This week-by-week plan assumes learners start with a personal-project interview. The foundations-first contract in `tasks/course-spec.md` supersedes it: onboarding is now short concept explanations, tiny deterministic challenges, exact feedback, and sequential unlock. The interview and project track return later. Keep this file for reference only.

## 1. Thesis
Learn to code by building a tool for a problem you actually have — with AI as your pair-programmer and you as the author.

Audience: builders (beginner-to-intermediate, no CS degree required) who want AI to write code but refuse to lose control of it.

Differentiator: every learner builds a personal, real-life project, and every AI-made change ends up in a review log the learner can show as proof.

## 2. First language: JavaScript
Why:
- Runs in the browser playground (Bolt-style / WebContainers) — zero install, no local setup.
- One language covers frontend, backend (Node), and scripts — full stack from day one.
- The AI/agent ecosystem is JS-first: examples, docs, and tooling all assume it.
- Fastest path from "what's your problem?" to "your app works."

Track 2 later: Python (automation, data, scripting). Track 3 later: language-agnostic fundamentals for people who want depth (memory, types, systems) — CS50-style but AI-native.

## 3. Core loop (every week)
1. Concept lesson — 5–10 min read + runnable demo in the playground.
2. AI prompt for this week's slice — "add X to your app," written with the week's prompt skill.
3. Build — agent writes part, learner writes part, guided by the lesson.
4. Diff review — read the diff, run it, keep or revert, explain why.
5. Check — automated (does it run? is the slice there? do the tests pass?) + review-log entry.
6. Rubber duck — "explain your code" checkpoint (text or audio, later).

## 4. Week-by-week

### Week 0 — What an agent is, and the interview
- Concepts: LLM + tools (read/edit/run/search), propose vs own, files and directories, playground tour.
- Interview: "What annoys you? What do you do by hand every day? What would you pay to never do again?" Scope the smallest useful app (one page, one job).
- Code: first HTML + JS — variables, output, comments.
- Agent skill: first prompt (be specific), first diff, accept/revert.
- Pset: your app in 3 sentences + a variable that holds its core data.

### Week 1 — Structure
- Concepts: functions, conditionals, scope basics.
- Slice: turn your 3 sentences into functions (addThing, checkThing, clearThings...).
- Agent skill: plan mode vs build mode; reading a diff top-to-bottom.
- Pset: agent writes one function; you write one from scratch; both reviewed.

### Week 2 — Data
- Concepts: strings, arrays, objects, JSON shape.
- Slice: model your problem's data (task list, expense tracker, note keeper).
- Agent skill: giving the agent context (data shape + expected behavior); batching instructions.
- Pset: extend the model; handle empty and duplicate input.

### Week 3 — Logic
- Concepts: loops, control flow, state.
- Slice: make the app actually do the thing (filter, sort, count, compute).
- Agent skill: when the agent's code is wrong — revert it, debug, ask again.
- Pset: one feature written entirely by you (agent locked out).

### Week 4 — Interface
- Concepts: DOM, events, forms, rendering lists.
- Slice: buttons, inputs, live list — usable by real you.
- Agent skill: UI iteration, prompt enhancement, reviewing visual changes.
- Pset: find and fix one usability or accessibility issue.

### Week 5 — Trust and bugs
- Concepts: console, error messages, simple tests/assertions, try/catch.
- Slice: harden your app; make it not lose data.
- Agent skill: permissions and approvals, sandbox limits, never paste secrets.
- Pset: write a test that catches a bug the agent introduced; revert its fix and fix it yourself.

### Week 6 — Ship
- Concepts: deploy, README, final polish.
- Slice: get your app to a shareable URL.
- Agent skill: full review log — every AI change listed with verdict and reason.
- Pset: complete the review log; invite one real person to use the app.

### Final — Your tool, live
Deployed URL + review log + short "explain your app" write-up. Optional certificate when all checks pass.

## 5. Assessment
- Automated: app runs, required slice exists, week's tests pass.
- Human: one review-log entry per week (what changed, why, reviewed by me, verdict).
- Certificate: all psets + final project + review log + deployed URL.

## 6. Phase-1 tech
- Static site (current repo) + embedded Bolt-style playground (Bolt.new, MIT / WebContainers).
- Keep the existing waitlist server; no auth for v1; progress in localStorage.
- No new dependencies beyond the playground embed.

## 7. Later (not now)
- Python track; real-machine lessons (Zed/VS Code on learner's computer).
- Accounts, community, review-log sharing; paid certificate; team mode.
