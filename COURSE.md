# Kolibri — Course Outline (original content)

> **Historical (pre-foundations).** This interview-first, project-first outline was written before the deterministic foundations course. The canonical contract is `tasks/course-spec.md`; the live preview is the JavaScript Foundations lesson in `course-content.mjs`. This file is kept for the later project track and is not a parallel source of truth.

Interactive course for builders who want to write real code with AI as a pair-programmer — while staying the author of it. You learn actual coding by building a tool for a problem you actually have.

## How it works
- It starts with an AI interview: "What annoys you? What do you do by hand every day? What problem would you pay to never have again?" You pick one real problem, and the AI helps you scope it down to the smallest useful app.
- Real coding is taught through slices of *your* app, in JavaScript (runs in the browser playground, full-stack, zero setup). Each week = one language concept + one piece of your project.
- The agent writes part of each slice. You read the diff, review it, revert it, or write it yourself. Every week ends with code you can explain.

## Weeks
**Week 0 — What an agent is, and the interview.** LLM + tools, propose vs own. Find your real problem, scope the smallest version. First lines: HTML + JS, variables, output.

**Week 1 — Structure.** Functions and conditionals. The skeleton of your app. Your first diff review.

**Week 2 — Data.** Strings, arrays, objects. Model your problem's data: a list, tracker, or notes.

**Week 3 — Logic.** Loops, control flow, state. Make the app actually do the thing you described.

**Week 4 — Interface.** Events, DOM, forms. Make it usable by real you, not a demo.

**Week 5 — Trust and bugs.** Tests, debugging, permissions, secrets. The agent suggests, you verify.

**Week 6 — Ship.** Polish, deploy, write your review log: every AI-made change, reviewed and justified by you.

**Final project — Your tool, live.** Ship the thing you scoped in Week 0, with its review log as proof you stayed in control. Optional certificate.

## Problem set pattern
Each week builds a slice of your own app. The agent does part of it; you must review it, revert it, or write it yourself. The final review log is the portfolio proof.
