import { hummingbirdAnimation } from './assets/hummingbird_data.js';
import { lesson, starterCode, STORAGE_KEY } from './page-content.js';

const MOTION_KEY = 'kolibri-motion-v1';
const systemReducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function storedMotionChoice() {
  try { return localStorage.getItem(MOTION_KEY); } catch { return null; }
}

// The system preference is the default, but a visitor can deliberately opt in or
// out with the control beside the hummingbird; that choice wins.
const motionChoice = storedMotionChoice();
const motionEnabled = motionChoice ? motionChoice === 'on' : !systemReducesMotion;
const reduceMotion = !motionEnabled;

// Braille art has no fixed advance width across platforms, so measure the block
// at its CSS baseline size and scale it to fill the column exactly.
function fitAsciiArt() {
  for (const pre of document.querySelectorAll('[data-ascii-fit]')) {
    const available = pre.parentElement?.clientWidth || 0;
    if (!available) continue;
    pre.style.fontSize = '';
    const base = parseFloat(getComputedStyle(pre).fontSize);
    const content = pre.getBoundingClientRect().width;
    if (!base || !content) continue;
    const max = Number(pre.dataset.asciiMax) || Infinity;
    const fitted = Math.min(max, Math.max(3, (base * available) / content * 0.995));
    pre.style.fontSize = `${fitted.toFixed(2)}px`;
  }
}

function initAsciiFit() {
  fitAsciiArt();
  document.fonts?.ready.then(fitAsciiArt).catch(() => {});
  let pending = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(fitAsciiArt);
  }, { passive: true });
}

function renderBirdFrame(frame) {
  const CONTRAST_BOOST = 1.8;
  const lines = frame.ascii.split('\n');
  const bGrid = frame.brightness;
  let html = '';
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    const bRow = bGrid[y] || [];
    for (let x = 0; x < line.length; x++) {
      const char = line[x];
      let val = bRow[x] || 0;
      if (char === ' ' || val === 0) { html += ' '; continue; }
      val = Math.min(255, Math.round(val * CONTRAST_BOOST));
      const norm = val / 255;
      const opacity = Math.max(0.3, norm).toFixed(2);
      const lightness = (20 + norm * 72).toFixed(0);
      const sat = (18 + norm * 38).toFixed(0);
      const glow = val > 200 ? ` text-shadow: 0 0 ${(val / 40).toFixed(1)}px currentColor;` : '';
      html += `<span style="color: hsl(42, ${sat}%, ${lightness}%); opacity: ${opacity};${glow}">${char}</span>`;
    }
    html += '\n';
  }
  return html;
}

function initBird() {
  const birdEl = document.getElementById('bird');
  const birdWrap = document.getElementById('bird-wrap');
  const toggle = document.getElementById('motion-toggle');
  const frames = hummingbirdAnimation.frames;
  const FRAME_MS = 1000 / 12;
  if (frames && frames.length && birdEl) {
    let i = 0;
    let timer = 0;
    const tick = () => { birdEl.innerHTML = renderBirdFrame(frames[i]); i = (i + 1) % frames.length; };
    tick();
    const setFlapping = (on) => {
      clearInterval(timer);
      timer = on ? setInterval(tick, FRAME_MS) : 0;
      if (birdWrap) birdWrap.dataset.motion = on ? 'on' : 'off';
      if (toggle) {
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        toggle.textContent = on ? 'Motion on' : 'Motion off';
      }
      fitAsciiArt();
    };
    setFlapping(!reduceMotion);
    toggle?.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-pressed') !== 'true';
      setFlapping(on);
      try { localStorage.setItem(MOTION_KEY, on ? 'on' : 'off'); } catch {}
    });
  }
  if (!reduceMotion && birdWrap) {
    let mx = 0, my = 0, sx = 0, sy = 0;
    const apply = () => {
      sx += (mx - sx) * 0.08;
      sy += (my - sy) * 0.08;
      birdWrap.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0)`;
      requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mx = ((e.clientX - cx) / cx) * 10;
      my = ((e.clientY - cy) / cy) * 6;
    }, { passive: true });
    requestAnimationFrame(apply);
  }
}

function evaluateRule(code) {
  try {
    const runner = new Function(`${code}
if (typeof isEssential !== 'function') return null;
const checks = [
  { name: 'Food', category: 'FOOD' },
  { name: 'Transport', category: 'Transport' },
  { name: 'Streaming', category: 'streaming' },
  { name: 'Housing', category: 'housing' },
  { name: 'Coffee', category: 'coffee' },
];
return checks.map((expense) => ({
  name: expense.name,
  category: expense.category,
  essential: !!isEssential(expense.category),
}));`);
    const results = runner();
    if (!Array.isArray(results)) return { error: 'none' };
    const byName = Object.fromEntries(results.map((r) => [r.name, r.essential]));
    const food = byName.Food;
    const transport = byName.Transport;
    const housing = byName.Housing;
    const streaming = byName.Streaming;
    if (food !== true) return { error: 'food' };
    if (transport === true && housing !== true) return { error: 'transport' };
    if (housing !== true || transport !== true) return { error: 'none' };
    if (streaming === true) return { error: 'streaming' };
    if (byName.Coffee === true) return { error: 'streaming' };
    return { pass: true, results };
  } catch {
    return { error: 'none' };
  }
}

function renderExpensePreview(results) {
  const el = document.getElementById('expense-preview');
  if (!el) return;
  if (!results) {
    el.textContent = 'Run the check to preview how each expense is classified.';
    return;
  }
  el.textContent = results.map((r) => `${r.name}: ${r.essential ? 'essential' : 'optional'}`).join('\n');
}

function initLesson() {
  const codeEditor = document.getElementById('expense-code');
  const resultEl = document.getElementById('expense-result');
  const reflectionEl = document.getElementById('expense-reflection');
  const hintEl = document.getElementById('expense-hint-text');
  const taskEl = document.getElementById('expense-task');
  if (!codeEditor || !resultEl) return;

  if (taskEl) taskEl.textContent = lesson.task;
  const reflQ = document.querySelector('.reflection-q');
  const reflF = document.querySelector('.reflection-follow');
  if (reflQ) reflQ.textContent = lesson.reflection;
  if (reflF) reflF.textContent = lesson.followUp;

  let hintIndex = 0;
  let passed = false;

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.code) codeEditor.value = data.code;
      if (data.passed) passed = true;
    } catch {}
  }

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: codeEditor.value, passed }));
    } catch {}
  };

  const runCheck = () => {
    const outcome = evaluateRule(codeEditor.value);
    resultEl.dataset.status = '';
    reflectionEl.hidden = true;
    if (outcome.pass) {
      resultEl.textContent = lesson.feedback.pass;
      resultEl.dataset.status = 'pass';
      passed = true;
      reflectionEl.hidden = false;
      renderExpensePreview(outcome.results);
    } else {
      const key = outcome.error || 'none';
      resultEl.textContent = lesson.feedback[key] || lesson.feedback.none;
      resultEl.dataset.status = 'fail';
      renderExpensePreview(null);
    }
    persist();
  };

  document.getElementById('expense-run')?.addEventListener('click', runCheck);
  document.getElementById('expense-hint')?.addEventListener('click', () => {
    hintEl.textContent = lesson.hints[Math.min(hintIndex, lesson.hints.length - 1)];
    hintIndex += 1;
  });
  document.getElementById('expense-reset')?.addEventListener('click', () => {
    codeEditor.value = starterCode;
    passed = false;
    hintIndex = 0;
    hintEl.textContent = '';
    resultEl.textContent = 'Not checked yet. Change the rule, then run the check.';
    resultEl.dataset.status = '';
    reflectionEl.hidden = true;
    renderExpensePreview(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  });

  codeEditor.addEventListener('input', persist);
  if (!codeEditor.value) codeEditor.value = starterCode;
  renderExpensePreview(null);
}

function initConceptMap() {
  const map = document.getElementById('concept-map');
  if (!map) return;
  const situations = map.querySelectorAll('[data-situation]');
  const update = (btn) => {
    situations.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    const input = btn.dataset.input || '';
    const action = btn.dataset.action || '';
    map.querySelector('[data-decision-input]').textContent = input;
    map.querySelector('[data-decision-action]').textContent = action;
  };
  situations.forEach((btn) => btn.addEventListener('click', () => update(btn)));
  update(situations[0]);
}

// The armature diagram is optional: without WebGL (or IntersectionObserver) the
// plate keeps its static CSS marks and three.js is never downloaded.
function initArmature() {
  const plate = document.getElementById('armature-plate');
  const canvas = document.getElementById('armature-canvas');
  const driver = document.getElementById('independent');
  if (!plate || !canvas || !driver || !('IntersectionObserver' in window)) return;

  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) return;
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  const load = () => import('./scene.js')
    .then(({ mountArmature }) => mountArmature({ canvas, driver, reduceMotion }))
    .then((instance) => { if (instance) plate.dataset.ready = 'true'; })
    .catch(() => {});

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    load();
  }, { rootMargin: '400px' });
  observer.observe(plate);
}

function initNav() {
  const links = document.querySelectorAll('[data-nav]');
  const sections = [...links].map((l) => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  const onScroll = () => {
    const y = window.scrollY + 120;
    let current = sections[0];
    for (const section of sections) {
      if (section.offsetTop <= y) current = section;
    }
    links.forEach((l) => {
      const active = l.getAttribute('href') === `#${current.id}`;
      l.classList.toggle('is-active', active);
      if (active) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = document.getElementById('nav-menu-btn');
  const menuPanel = document.getElementById('nav-menu-panel');
  menuBtn?.addEventListener('click', () => {
    const open = menuPanel.hidden;
    menuPanel.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

async function submitWaitlist(form, statusEl) {
  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button[type="submit"]');
  const setStatus = (msg, cls) => {
    statusEl.textContent = msg;
    statusEl.className = 'form-status' + (cls ? ` ${cls}` : '');
  };
  const email = input.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus('Enter a valid email.', 'err');
    return;
  }
  btn.disabled = true;
  setStatus('Sending…');
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      form.reset();
      setStatus("You're on the list.", 'ok');
    } else if (res.status === 429) {
      setStatus('Slow down. Try again later.', 'err');
    } else {
      setStatus('Something broke. Try again.', 'err');
    }
  } catch {
    setStatus('Network error. Try again.', 'err');
  } finally {
    btn.disabled = false;
  }
}

function initWaitlist() {
  const form = document.getElementById('waitlist-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitWaitlist(form, status);
  });
}

initAsciiFit();
initBird();
initLesson();
initConceptMap();
initArmature();
initNav();
initWaitlist();
