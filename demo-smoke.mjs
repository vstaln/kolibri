// Smoke test: drive the lesson demo's three stages with a minimal DOM stub.
// Run with: node course/demo-smoke.mjs  (no dependencies, no browser)
import assert from 'node:assert/strict';
import { course } from './course-content.mjs';
import { PROGRESS_KEY, orderedChallenges } from './course-state.mjs';
import { initCourse } from './course-app.mjs';

const makeEl = (tag = 'div') => ({
  _tag: tag,
  innerHTML: '', textContent: '', hidden: false,
  className: '', dataset: {}, style: {}, value: '',
  disabled: false, readOnly: false,
  _children: [], _handlers: {}, _parent: null, _attributes: {}, _focusCount: 0,
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  appendChild(c) { c._parent = this; this._children.push(c); },
  append(...children) { for (const child of children) { child._parent = this; this._children.push(child); } },
  replaceChildren(...children) { this._children = []; this.append(...children); },
  insertAdjacentHTML(_pos, html) { this.innerHTML += html; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener(type, fn) { (this._handlers[type] ??= []).push(fn); },
  remove() {
    if (this._parent) {
      const i = this._parent._children.indexOf(this);
      if (i >= 0) this._parent._children.splice(i, 1);
    }
  },
  setAttribute(name, value) { this._attributes[name] = String(value); },
  getAttribute(name) { return this._attributes[name] ?? null; },
  removeAttribute(name) { delete this._attributes[name]; },
  focus() { this._focusCount += 1; },
  get scrollTop() { return 0; }, set scrollTop(_v) {},
});

const tabs = [makeEl(), makeEl(), makeEl()];
const rails = [makeEl(), makeEl(), makeEl()];
const mobileTabs = [makeEl(), makeEl(), makeEl()];
tabs[0].dataset.stageTab = 'learn';
tabs[1].dataset.stageTab = 'debug';
tabs[2].dataset.stageTab = 'project';
rails[0].dataset.rail = 'learn';
rails[1].dataset.rail = 'debug';
rails[2].dataset.rail = 'project';
mobileTabs[0].dataset.mobileTab = 'code';
mobileTabs[1].dataset.mobileTab = 'output';
mobileTabs[2].dataset.mobileTab = 'chat';

const byId = {};
for (const id of ['lessons', 'demo-code', 'demo-chat', 'demo-prompts', 'demo-attach', 'demo-output', 'demo-diff-actions', 'demo-status']) byId[id] = makeEl();
byId['demo-output'].querySelector = () => makeEl();

globalThis.window = {
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
  innerWidth: 1200,
  IntersectionObserver: class { observe() {} },
};
globalThis.IntersectionObserver = globalThis.window.IntersectionObserver;
globalThis.document = {
  fonts: { ready: Promise.resolve() },
  documentElement: { classList: { add() {} } },
  createElement: () => makeEl(),
  getElementById: (id) => byId[id] ?? null,
  querySelector: (sel) => (sel === '[data-file-tabs]' || sel === '.ide-body' ? makeEl() : null),
  querySelectorAll: (sel) => {
    if (sel === '[data-stage-tab]') return tabs;
    if (sel === '[data-rail]') return rails;
    if (sel === '[data-mobile-tab]') return mobileTabs;
    return [];
  },
};

await import(new URL('./app.js', import.meta.url));

const click = (el) => (el._handlers.click ?? []).forEach((fn) => fn({}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const status = () => byId['demo-status'].textContent;

// Learn stage, static.
click(tabs[0]);
await sleep(400);
if (status() !== 'STATUS: expenses.js · change applied · check passed') throw new Error(`learn: ${status()}`);
if (byId['demo-chat']._children.length < 4) throw new Error(`learn chat too small: ${byId['demo-chat']._children.length}`);
if (!byId['demo-code'].innerHTML.includes('food')) throw new Error('learn editor missing solved code');

// Prompt chip, read-only Q&A.
const chips = byId['demo-prompts']._children;
if (!chips.length) throw new Error('no prompt chips rendered');
const before = byId['demo-chat']._children.length;
click(chips[0]);
await sleep(900);
if (byId['demo-chat']._children.length < before + 2) throw new Error('chip Q&A did not append');

// Debug stage, static.
click(tabs[1]);
await sleep(800);
if (status() !== 'STATUS: 4 files · 5 tests passing') throw new Error(`debug: ${status()}`);
if (!byId['demo-output'].innerHTML.includes('all green')) throw new Error('debug output not green');
if (!byId['demo-code'].innerHTML.includes("return 'overdue'")) throw new Error('debug editor missing fix');

// Project stage, static.
click(tabs[2]);
await sleep(1200);
if (status() !== 'STATUS: app.js · 1/4 requirements complete') throw new Error(`project: ${status()}`);
if (!byId['demo-code'].innerHTML.includes('done: true')) throw new Error('project editor missing manual edit');
if (!byId['demo-output'].innerHTML.includes('1 open item')) throw new Error('project preview not updated');

// Mobile tabs toggle.
click(mobileTabs[2]);
click(mobileTabs[0]);

// --- Course flow: deterministic foundations runner (browser-free) ---
const challengeById = new Map(orderedChallenges(course).map(({ challenge }) => [challenge.id, challenge]));
const COURSE_IDS = [
  'course-map', 'course-breadcrumb', 'course-challenge-title', 'course-concept',
  'course-explanation', 'course-instruction', 'course-editor', 'course-run',
  'course-reset', 'course-next', 'course-feedback', 'course-hints',
  'course-completion', 'course-storage-note',
];
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const courseStorage = () => {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    dump() { return Object.fromEntries(data); },
  };
};

const bootCourse = ({ hash = '', storage = courseStorage(), throwing = false } = {}) => {
  if (throwing) {
    storage.getItem = () => { throw new Error('storage blocked'); };
    storage.setItem = () => { throw new Error('storage blocked'); };
  }
  const elements = {};
  for (const id of COURSE_IDS) {
    elements[id] = makeEl();
    Object.defineProperty(elements[id], 'innerHTML', {
      get() { return ''; },
      set() { throw new Error('course UI must render with textContent, not innerHTML'); },
    });
  }
  const shell = makeEl('section');
  const doc = {
    body: makeEl('body'),
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => elements[id] ?? null,
    querySelector: (selector) => (selector === '[data-course-shell]' ? shell : null),
  };
  const win = {
    location: { hash },
    history: { replaceState() {} },
    localStorage: storage,
    _handlers: {},
    _timers: [],
    _timerId: 0,
    addEventListener(type, fn) { (this._handlers[type] ??= []).push(fn); },
    removeEventListener(type, fn) { this._handlers[type] = (this._handlers[type] ?? []).filter((h) => h !== fn); },
    setTimeout(fn, delay) { this._timers.push({ id: ++this._timerId, fn, delay }); return this._timerId; },
    clearTimeout() {},
  };
  globalThis.window = win;
  globalThis.document = doc;
  initCourse();
  return { elements, win, doc, storage };
};

const resultFor = (message, { ok = false, error = null, messageText = null, actual = null } = {}) => {
  const challenge = challengeById.get(message.challengeId);
  assert.ok(challenge, 'runner message targets an authored challenge');
  const test = challenge.tests[0];
  const expected = Array.isArray(test.expected) ? test.expected : test.expected;
  const wrong = Array.isArray(test.expected) ? ['WRONG'] : 'WRONG';
  return {
    version: 1,
    type: 'result',
    runId: message.runId,
    challengeId: message.challengeId,
    ok,
    checks: [{
      id: test.id,
      pass: ok,
      actual: actual ?? (ok ? expected : wrong),
      expected,
      message: messageText ?? (ok ? 'Passed.' : 'Try again.'),
    }],
    error,
  };
};

async function courseRun(boot, buildResult, { staleFirst = false, timeout = false } = {}) {
  const { elements, win, doc } = boot;
  const runPromise = elements['course-run']._handlers.click[0]();
  const frame = doc.body._children.find((child) => child._tag === 'iframe');
  if (timeout) {
    assert.ok(frame, 'run creates a runner iframe');
    const timer = win._timers.find((t) => t.delay === 2000);
    assert.ok(timer, 'run timeout is scheduled');
    timer.fn();
    await runPromise;
    await tick();
    return;
  }
  assert.ok(frame, 'run creates a runner iframe');
  assert.equal(frame.getAttribute('sandbox'), 'allow-scripts', 'runner sandbox is allow-scripts only');
  assert.equal(frame.getAttribute('aria-hidden'), 'true', 'runner iframe is hidden from assistive tech');
  assert.ok(elements['course-feedback']._focusCount > 0, 'focus moves to feedback while running');
  const child = { _message: null, postMessage(message) { this._message = message; } };
  frame.contentWindow = child;
  for (const fn of frame._handlers.load ?? []) fn();
  assert.ok(child._message, 'runner receives the run message');
  const valid = buildResult(child._message);
  if (staleFirst) {
    for (const fn of win._handlers.message ?? []) fn({ source: child, data: { ...valid, runId: child._message.runId + 1 } });
    await tick();
    assert.ok(elements['course-feedback'].textContent.includes('Running tests'), 'stale result is ignored');
  }
  for (const fn of win._handlers.message ?? []) fn({ source: child, data: valid });
  await runPromise;
  await tick();
}

const stateOf = (boot) => boot.elements['course-map']._children.map((el) => el.dataset.state);
const starter1 = "const greeting = 'Hello';\nconsole.log(greeting);";

// Fresh start: order, accessibility, focus, hints.
const b0 = bootCourse();
assert.equal(b0.elements['course-challenge-title'].textContent, 'Print a greeting');
assert.equal(b0.elements['course-editor'].value, starter1);
assert.deepEqual(stateOf(b0), ['READY', 'LOCKED', 'LOCKED']);
assert.equal(b0.elements['course-map']._children[0]._children[0]._attributes['aria-current'], 'step');
assert.equal(b0.elements['course-map']._children[1]._children[0].disabled, true);
assert.equal(b0.elements['course-map']._children[1]._children[0]._attributes['aria-disabled'], 'true');
const hintDetails = b0.elements['course-hints']._children.filter((child) => child._tag === 'details');
assert.equal(hintDetails.length, 3);
assert.equal(hintDetails[0]._children[0]._tag, 'summary');
assert.ok(b0.elements['course-editor']._focusCount > 0, 'editor focused on open');

// Draft save on input.
b0.elements['course-editor'].value = 'const greeting = "draft";';
b0.elements['course-editor']._handlers.input[0]();
assert.ok(
  JSON.parse(b0.storage.getItem(PROGRESS_KEY)).drafts['js-foundations-m01-l01-c01'].includes('draft'),
  'input saves a draft'
);

// Fail: feedback, focus, next stays locked.
await courseRun(b0, (m) => resultFor(m));
assert.ok(b0.elements['course-feedback'].textContent.includes('Expected'), 'failure shows expected/received');
assert.deepEqual(stateOf(b0), ['FAILED', 'LOCKED', 'LOCKED']);
assert.ok(b0.elements['course-editor']._focusCount > 0, 'focus returns to editor after fail');

// Failure copy is escaped: rendered as text, never HTML.
await courseRun(b0, (m) => resultFor(m, { actual: ['<img src=x onerror=alert(1)>'] }));
assert.ok(
  b0.elements['course-feedback'].textContent.includes('<img src=x onerror=alert(1)>'),
  'learner-derived values stay text'
);

// Reset restores the exact starter and clears only the current draft.
b0.elements['course-reset']._handlers.click[0]();
assert.equal(b0.elements['course-editor'].value, starter1);
assert.deepEqual(stateOf(b0), ['READY', 'LOCKED', 'LOCKED']);
assert.ok(!JSON.parse(b0.storage.getItem(PROGRESS_KEY)).drafts['js-foundations-m01-l01-c01'], 'reset clears the draft');

// Pass c1 with a stale result first; unlock c2 only.
await courseRun(b0, (m) => resultFor(m, { ok: true }), { staleFirst: true });
assert.ok(b0.elements['course-feedback'].textContent.includes('The greeting is exact'), 'c1 pass feedback');
assert.deepEqual(stateOf(b0), ['PASSED', 'READY', 'LOCKED']);
assert.equal(b0.elements['course-run'].disabled, true, 'passed challenge is review-only');
assert.equal(b0.elements['course-next'].disabled, false, 'next unlocks after pass');
assert.ok(b0.elements['course-next']._focusCount > 0, 'focus moves to next after pass');

// c2 fail -> pass -> c3 unlock; c3 pass -> completion.
b0.elements['course-next']._handlers.click[0]();
assert.equal(b0.elements['course-challenge-title'].textContent, 'Update a count');
await courseRun(b0, (m) => resultFor(m));
assert.deepEqual(stateOf(b0), ['PASSED', 'FAILED', 'LOCKED']);
await courseRun(b0, (m) => resultFor(m, { ok: true }));
assert.deepEqual(stateOf(b0), ['PASSED', 'PASSED', 'READY']);
b0.elements['course-next']._handlers.click[0]();
assert.equal(b0.elements['course-challenge-title'].textContent, 'Render a list');
b0.elements['course-editor'].value = "const fruits = ['apples', 'oranges'];\ndocument.querySelector('#app').textContent = fruits.join(', ');";
b0.elements['course-editor']._handlers.input[0]();
await courseRun(b0, (m) => resultFor(m, { ok: true }));
assert.deepEqual(stateOf(b0), ['PASSED', 'PASSED', 'PASSED']);
assert.equal(b0.elements['course-completion'].hidden, false);
assert.ok(b0.elements['course-completion'].textContent.includes('You finished the JavaScript Foundations preview — 3 challenges.'));
assert.equal(b0.elements['course-next'].textContent, 'Finish lesson');
assert.equal(b0.elements['course-next'].disabled, true);

// Review-only passed challenge: reset restores starter but never revokes mastery.
const reviewStorage = courseStorage();
for (const [key, value] of Object.entries(b0.storage.dump())) reviewStorage.setItem(key, value);
const bReview = bootCourse({ hash: '#course/js-foundations-m01-l01-c01', storage: reviewStorage });
assert.equal(bReview.elements['course-challenge-title'].textContent, 'Print a greeting');
assert.equal(bReview.elements['course-editor'].readOnly, true);
assert.equal(bReview.elements['course-run'].disabled, true);
bReview.elements['course-reset']._handlers.click[0]();
assert.equal(bReview.elements['course-editor'].value, starter1);
assert.deepEqual(stateOf(bReview), ['PASSED', 'PASSED', 'PASSED']);
assert.equal(bReview.elements['course-run'].disabled, true, 'reset does not re-enable a passed review');
const reviewBodyCount = bReview.doc.body._children.length;
bReview.elements['course-editor']._handlers.keydown[0]({ ctrlKey: true, key: 'Enter', preventDefault() {} });
await tick();
assert.equal(bReview.doc.body._children.length, reviewBodyCount, 'Ctrl+Enter cannot run a passed review');
assert.ok(bReview.elements['course-feedback'].textContent.includes('The greeting is exact'), 'review feedback stays pass');

// Reload keeps current challenge, mastery, and draft.
const reloadStorage = courseStorage();
for (const [key, value] of Object.entries(b0.storage.dump())) reloadStorage.setItem(key, value);
const bReload = bootCourse({ storage: reloadStorage });
assert.equal(bReload.elements['course-challenge-title'].textContent, 'Render a list');
assert.deepEqual(stateOf(bReload), ['PASSED', 'PASSED', 'PASSED']);
assert.ok(bReload.elements['course-editor'].value.includes("fruits.join(', ')"), 'reload restores the draft');

// Corrupt storage falls back to a fresh state.
const corruptStorage = courseStorage();
corruptStorage.setItem(PROGRESS_KEY, '{not json');
const bCorrupt = bootCourse({ storage: corruptStorage });
assert.equal(bCorrupt.elements['course-challenge-title'].textContent, 'Print a greeting');
assert.deepEqual(stateOf(bCorrupt), ['READY', 'LOCKED', 'LOCKED']);

// Locked deep link resolves to the first incomplete challenge without clearing drafts.
const linkStorage = courseStorage();
linkStorage.setItem(PROGRESS_KEY, JSON.stringify({
  version: 1,
  courseId: course.id,
  currentChallengeId: 'js-foundations-m01-l01-c01',
  passedIds: [],
  drafts: { 'js-foundations-m01-l01-c01': 'const greeting = "draft";' },
}));
const bLink = bootCourse({ hash: '#course/js-foundations-m01-l01-c03', storage: linkStorage });
assert.equal(bLink.elements['course-challenge-title'].textContent, 'Print a greeting');
assert.ok(bLink.elements['course-editor'].value.includes('draft'), 'deep-link fallback keeps the draft');

// Runtime error, timeout, and output-limit feedback.
const bError = bootCourse();
await courseRun(bError, (m) => resultFor(m, { error: { name: 'RuntimeError', message: 'boom' } }));
assert.ok(bError.elements['course-feedback'].textContent.includes('raised an error'), 'runtime error feedback');
assert.ok(bError.elements['course-feedback'].textContent.includes('Error: boom'), 'sanitized error message');
assert.deepEqual(stateOf(bError), ['FAILED', 'LOCKED', 'LOCKED']);

const bTimeout = bootCourse();
await courseRun(bTimeout, () => null, { timeout: true });
assert.ok(bTimeout.elements['course-feedback'].textContent.includes('took too long'), 'timeout feedback');
assert.deepEqual(stateOf(bTimeout), ['FAILED', 'LOCKED', 'LOCKED']);

const bOutput = bootCourse();
await courseRun(bOutput, (m) => resultFor(m, { error: { name: 'OutputLimitError', message: 'x' } }));
assert.ok(bOutput.elements['course-feedback'].textContent.includes('too much output'), 'output limit feedback');

// Oversized code never reaches the runner.
const bCode = bootCourse();
bCode.elements['course-editor'].value = 'x'.repeat(50 * 1024 + 1);
await bCode.elements['course-run']._handlers.click[0]();
assert.ok(bCode.elements['course-feedback'].textContent.includes('under 50 KiB'), 'code limit feedback');
assert.equal(bCode.doc.body._children.some((child) => child._tag === 'iframe'), false, 'oversized code creates no iframe');
assert.deepEqual(stateOf(bCode), ['FAILED', 'LOCKED', 'LOCKED']);

// Throwing storage still runs in memory and says so.
const bStorage = bootCourse({ throwing: true });
assert.equal(bStorage.elements['course-storage-note'].hidden, false);
assert.ok(bStorage.elements['course-storage-note'].textContent.includes('will not survive reload'), 'storage failure notice');

console.log('smoke ok: learn, prompt chips, debug, project, mobile tabs, course flow');
