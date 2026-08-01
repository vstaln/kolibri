// Smoke test: drive the lesson demo's three stages with a minimal DOM stub.
// Run with: node course/demo-smoke.mjs  (no dependencies, no browser)
const makeEl = () => ({
  innerHTML: '', textContent: '', hidden: false,
  className: '', dataset: {}, style: {},
  _children: [], _handlers: {}, _parent: null,
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  appendChild(c) { c._parent = this; this._children.push(c); },
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
  setAttribute() {}, removeAttribute() {},
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
if (!byId['demo-code'].innerHTML.includes('paid: true')) throw new Error('project editor missing manual edit');
if (!byId['demo-output'].innerHTML.includes('1 open invoice')) throw new Error('project preview not updated');

// Mobile tabs toggle.
click(mobileTabs[2]);
click(mobileTabs[0]);
console.log('smoke ok: learn, prompt chips, debug, project, mobile tabs');
