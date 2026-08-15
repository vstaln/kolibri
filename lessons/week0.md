# Week 0 — What an agent is, and the interview

> **Historical draft.** This week belongs to the later personal-project track. Onboarding now starts with the deterministic JavaScript Foundations preview (`tasks/course-spec.md`, `course-content.mjs`), not with an agent interview.

Goal: by end of week, you have a one-page app idea scoped to a real problem, a running HTML+JS file in the playground, variables holding your core data, and your first reviewed agent edit.

## 0.1 — What an agent actually is
- An agent = an LLM + tools (read files, edit files, run commands, search).
- It proposes code. You own it. Nobody else reviews what it does for you.
- Code lives in files in a project. The playground has three panels: files, editor, run.

## 0.2 — The interview
The AI asks, and you answer in your own words:
1. What's something you do by hand every week that annoys you?
2. If you could press one button and it was done, what would the button do?
3. What data is involved? (names, dates, numbers, text, lists)
4. Who else would use it, if anyone?
5. What's the smallest version that would still help you?

Scoping rule: one page, one job, works for you first.

Output: a 3-sentence app description + a list of the data it needs.

## 0.3 — First lines of code
- HTML skeleton: `<!DOCTYPE html>`, title, `<h1>`, `<div id="app">`.
- JS basics: `let` and `const`, strings, numbers, arrays.
- Show output with `console.log` and by writing into `#app`.
- Every line gets a comment saying what you intend it to do.

## 0.4 — Your first agent edit
- Prompt template: "In this project, add ___ that does ___. Keep it small. Show me the diff."
- Read the diff: what changed, what stayed, do you understand every line?
- Accept or revert. Checklist: does it run? did it change anything else? can you explain it?

## Pset 0
1. Three-sentence app description.
2. Variables for your core data (at least two: e.g., a list of items + a count).
3. One agent edit: the agent adds a small function; you review the diff and keep or revert it.
4. One review-log line (template below).
5. Rubber duck: explain your app in 2–3 sentences.

## Review log (starts now, used every week)
| Change | Why | Reviewed by me? | Verdict |
|---|---|---|---|
| Agent added addThing() | handles new items | yes | kept after running it |
