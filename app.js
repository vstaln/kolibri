import { lessonDemo } from './page-content.js';

// This module is served as /app.js?v=<hash of its sources, the datasets included>.
// The frame data are plain /assets URLs that Cloudflare and the browser are both
// allowed to cache, so they have to inherit that same version or a new animation
// keeps losing to the copy already in the cache.
const assetVersion = new URL(import.meta.url).search;
const birdDataUrl = (slug) => new URL(`./assets/${slug}_data.js${assetVersion}`, import.meta.url).href;

// Both ASCII animations play by default. A reduced-motion request removes the
// pointer parallax and halves the flap rate, but does not freeze them.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// "Vibrant Glow" treatment, identical in both source viewers: per-glyph
// brightness drives a single blue hue, its lightness, its opacity and the size
// of its own halo. Constants are the viewers' defaults — changing them changes
// the look.
const CONTRAST_BOOST = 1.8;
// The viewers glow `brightness / 30` px at their own 17px type. This page sets
// the birds far smaller, so the halo is carried in em and keeps its proportions
// at any size.
const GLOW_EM_PER_UNIT = 1 / (30 * 17);
// Both datasets are already boomeranged — 37 distinct frames arrive as 72, 60 as
// 118 — so playing them straight through on a loop gives the intended there-and-
// back wingbeat. 24 fps is the rate the frames were stabilised at.
const FRAME_MS = 1000 / (reduceMotion ? 12 : 24);

function renderBirdFrame(frame) {
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
      const opacity = Math.max(0.25, norm).toFixed(2);
      const lightness = (25 + norm * 75).toFixed(0);
      const glow = (val * GLOW_EM_PER_UNIT).toFixed(4);
      html += `<span style="color: hsl(200, 95%, ${lightness}%); opacity: ${opacity}; text-shadow: 0 0 ${glow}em currentColor;">${char}</span>`;
    }
    html += '\n';
  }
  return html;
}

// Drives one <pre> from one dataset. The markup already carries that dataset's
// first frame, so a dataset that never arrives costs the motion, not the bird.
function makeBird(el, slug) {
  let frames = null;
  let timer = 0;
  let index = 0;
  let wanted = false;
  const tick = () => {
    el.innerHTML = renderBirdFrame(frames[index]);
    index = (index + 1) % frames.length;
    // The font size is settled once the dataset loads; re-measuring it on
    // every frame forces a layout read on a 95-column glyph grid and made
    // the animation stutter on slower machines.
    if (index === 1) fitAsciiArt();
  };
  const sync = () => {
    clearInterval(timer);
    timer = frames && wanted ? setInterval(tick, FRAME_MS) : 0;
  };
  return {
    set(on) { wanted = on; sync(); },
    load() {
      return import(birdDataUrl(slug))
        .then((mod) => {
          const data = mod.default || Object.values(mod)[0];
          if (!data?.frames?.length) return;
          frames = data.frames;
          tick();
          fitAsciiArt();
          sync();
        })
        .catch(() => {});
    },
  };
}

function initBirds() {
  const birdWrap = document.getElementById('bird-wrap');
  // Top hero = hummingbird feeding. Closing bloom = flower (dataset slug unchanged).
  const birds = [
    [document.getElementById('bird'), 'hummingbird-feeding'],
    [document.getElementById('bloom'), 'hummingbird-hover'],
  ]
    .filter(([el]) => el)
    .map(([el, slug]) => makeBird(el, slug));

  for (const bird of birds) bird.set(true);
  if (birdWrap) birdWrap.dataset.motion = 'on';
  fitAsciiArt();

  // The hero bird is above the fold; the bloom is a whole page down and
  // its dataset is the larger of the two, so it waits until it is nearly in view
  // rather than competing with the hero for bandwidth.
  birds[0]?.load();
  const bloom = document.getElementById('bloom');
  if (birds.length > 1 && bloom) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      birds[1].load();
    }, { rootMargin: '400px' });
    observer.observe(bloom);
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

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Rendered code replaces the old editable textarea. changedLines are 1-indexed
// lines that flash once (used by the autoplay "solution" beat). The lines are
// block spans, so no newline separator: a '\n' between spans would render as an
// extra blank line inside the white-space:pre code block.
function renderCode(el, code, changedLines) {
  if (!el) return;
  if (!code) { el.innerHTML = ''; return; }
  el.innerHTML = code.split('\n')
    .map((line, i) => {
      const diff = changedLines && changedLines.includes(i + 1);
      const text = escapeHtml(line) || '&nbsp;';
      return `<span class="code-line${diff ? ' code-line--diff' : ''}">${text}</span>`;
    })
    .join('');
}

// Autoplay typing beat: one line types itself in, caret at the typing position.
// lines hold the pre-solve code; typingLine (1-indexed) shows the partial text.
function renderCodeTyping(el, lines, typingLine, typingText) {
  if (!el) return;
  el.innerHTML = lines
    .map((line, i) => {
      const active = i + 1 === typingLine;
      const text = escapeHtml(active ? typingText : line) || '&nbsp;';
      return `<span class="code-line${active ? ' code-line--typing' : ''}">${text}${active ? '<span class="caret" aria-hidden="true"></span>' : ''}</span>`;
    })
    .join('');
}

// Three-stage IDE demonstration: Learn -> Build & Debug -> Final Project.
// Plays once on scroll into view; clicking a stage tab or a suggested prompt
// stops the script and shows that stage's populated static state. Nothing in
// the demo is interactive beyond those read-only clicks.
function initLessonDemo() {
  const section = document.getElementById('lessons');
  const tabs = [...document.querySelectorAll('[data-stage-tab]')];
  const railPanes = [...document.querySelectorAll('[data-rail]')];
  if (!section || !tabs.length || !railPanes.length) return;

  const codeEl = document.getElementById('demo-code');
  const chatLog = document.getElementById('demo-chat');
  const promptsEl = document.getElementById('demo-prompts');
  const attachEl = document.getElementById('demo-attach');
  const outputEl = document.getElementById('demo-output');
  const diffActions = document.getElementById('demo-diff-actions');
  const fileTabsEl = document.querySelector('[data-file-tabs]');
  const statusEl = document.getElementById('demo-status');
  const ideBody = document.querySelector('.ide-body');
  const mobileTabs = [...document.querySelectorAll('[data-mobile-tab]')];

  let timers = [];
  let stopped = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const stop = () => {
    stopped = true;
    clearTimers();
  };

  // --- chat ---
  const chatMsg = (cls, html) => {
    const div = document.createElement('div');
    div.className = `chat-msg ${cls}`;
    div.innerHTML = html;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  };
  // Brief typing indicator, then the message lands as a whole block.
  const chatTyping = (ms, cls, html, done) => {
    const dots = document.createElement('div');
    dots.className = 'chat-typing';
    dots.innerHTML = '<span></span><span></span><span></span>';
    chatLog.appendChild(dots);
    chatLog.scrollTop = chatLog.scrollHeight;
    later(ms, () => {
      dots.remove();
      chatMsg(cls, html);
      done?.();
    });
  };
  const patchCard = (file, summary) => {
    const card = document.createElement('div');
    card.className = 'chat-msg chat-msg--ai';
    card.innerHTML = `<div class="patch-card"><strong>PROPOSED CHANGE</strong><p>${escapeHtml(file)} · ${escapeHtml(summary)}</p><span class="patch-preview">Preview in editor</span></div>`;
    chatLog.appendChild(card);
    chatLog.scrollTop = chatLog.scrollHeight;
  };
  const renderPrompts = (prompts) => {
    if (!promptsEl) return;
    promptsEl.innerHTML = '';
    prompts.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat-chip';
      b.dataset.prompt = i;
      b.textContent = p.label;
      b.addEventListener('click', () => {
        stop();
        promptsEl.innerHTML = '';
        setAttach(p.attach || null);
        chatTyping(0, 'chat-msg--user', escapeHtml(p.q), () => {
          chatTyping(600, 'chat-msg--ai', escapeHtml(p.a));
        });
      });
      promptsEl.appendChild(b);
    });
  };

  // --- panels ---
  const setStage = (name) => {
    tabs.forEach((t) => {
      const active = t.dataset.stageTab === name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    railPanes.forEach((p) => { p.hidden = p.dataset.rail !== name; });
  };
  const railDone = (name, n) => {
    const pane = railPanes.find((p) => p.dataset.rail === name);
    if (!pane) return;
    [...pane.querySelectorAll('.rail-list li')].slice(0, n).forEach((li) => li.classList.add('is-done'));
  };
  const setFileTabs = (labels, active) => {
    if (!fileTabsEl) return;
    fileTabsEl.innerHTML = '';
    labels.forEach((l) => {
      const span = document.createElement('span');
      span.className = `workspace-tab${l === active ? ' is-active' : ''}`;
      span.textContent = l;
      fileTabsEl.appendChild(span);
    });
  };
  const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };
  const setAttach = (label) => {
    if (!attachEl) return;
    if (!label) { attachEl.hidden = true; attachEl.textContent = ''; return; }
    attachEl.hidden = false;
    attachEl.textContent = label;
  };
  const showDiffActions = () => { if (diffActions) diffActions.hidden = false; };
  const hideDiffActions = () => { if (diffActions) diffActions.hidden = true; };
  const clearOutput = () => { if (outputEl) outputEl.innerHTML = ''; };

  // --- editor rows ---
  const codeFromLines = (code) => code.split('\n').map((text) => ({ text }));
  const markLine = (rows, index) => {
    rows[index - 1] = { ...rows[index - 1], cls: 'code-line--selected' };
    return rows;
  };
  const renderRows = (rows) => {
    if (!codeEl) return;
    codeEl.innerHTML = rows.map((row) =>
      `<span class="code-line${row.cls ? ` ${row.cls}` : ''}">${escapeHtml(row.text) || '&nbsp;'}</span>`
    ).join('');
  };
  // Patch preview: a replaced line shows as -/+, appended lines as +.
  const renderPatch = (rows, patch) => {
    if (patch.replace) {
      const { line, from, to } = patch.replace;
      return [
        ...rows.slice(0, line - 1),
        { text: `- ${from}`, cls: 'code-line--del' },
        { text: `+ ${to}`, cls: 'code-line--add' },
        ...rows.slice(line),
      ];
    }
    if (patch.add) {
      return [...rows, ...patch.add.map((text) => ({ text: `+ ${text}`, cls: 'code-line--add' }))];
    }
    return rows;
  };

  // --- output ---
  const outputTest = (text, status) => {
    if (!outputEl) return;
    outputEl.innerHTML = `<strong>Test result</strong><pre class="test-data" data-status="${status}">${escapeHtml(text)}</pre>`;
  };
  const outputPreview = (text) => {
    if (!outputEl) return;
    outputEl.innerHTML = `<strong>Preview</strong><pre class="test-data">${escapeHtml(text)}</pre>`;
  };
  // Learn check beat: preview rows land one at a time, then the verdict.
  const animateCheck = (rows, verdict, done, speed) => {
    const s = speed ?? 1;
    if (!outputEl) return done?.();
    outputEl.innerHTML = '<strong>Expense data</strong><pre class="expense-data"></pre>';
    const pre = outputEl.querySelector('pre');
    rows.forEach((r, i) => later(i * 120 * s, () => {
      const span = document.createElement('span');
      span.className = 'output-row';
      span.textContent = r;
      pre.appendChild(span);
    }));
    later((rows.length * 120 + 250) * s, () => {
      const p = document.createElement('p');
      p.className = 'check-result';
      p.dataset.status = 'pass';
      p.textContent = verdict;
      outputEl.appendChild(p);
      done?.();
    });
  };

  // Scripted typing beat: line `lineIndex` (1-indexed) types `toText` in.
  const typeLine = (el, lines, lineIndex, toText, onDone, speed) => {
    let i = 0;
    const STEP = Math.max(1, Math.round((reduceMotion ? 4 : 35) * (speed ?? 1)));
    const step = () => {
      i += 1;
      renderCodeTyping(el, lines, lineIndex, toText.slice(0, i));
      if (i < toText.length) later(STEP, step);
      else {
        renderCode(el, lines.join('\n'), [lineIndex]);
        onDone?.();
      }
    };
    later(STEP, step);
  };

  // --- stages ---
  const playLearn = (staticMode) => {
    const T = staticMode ? 0 : 1;
    const { learn } = lessonDemo;
    const from = learn.code.starter.split('\n')[9];
    const to = learn.code.solved.split('\n')[9];
    clearTimers();
    setStage('learn');
    setFileTabs([learn.file], learn.file);
    setAttach(null);
    hideDiffActions();
    renderCode(codeEl, learn.code.starter);
    clearOutput();
    setStatus('STATUS: expenses.js selected · check not run');
    chatLog.innerHTML = '';
    renderPrompts(learn.prompts);

    chatTyping(600 * T, 'chat-msg--ai', `<p>${learn.intro.map(escapeHtml).join('</p><p>')}</p><p class="chat-task">${escapeHtml(learn.task)}</p>`);
    later(2200 * T, () => {
      renderRows(markLine(codeFromLines(learn.code.starter), 10));
      railDone('learn', 1);
    });
    later(3100 * T, () => {
      setAttach(learn.qa[0].attach);
      chatMsg('chat-msg--user', escapeHtml(learn.qa[0].q));
    });
    later(4400 * T, () => chatTyping(700 * T, 'chat-msg--ai', escapeHtml(learn.qa[0].a)));
    later(5700 * T, () => {
      setAttach(learn.qa[1].attach);
      chatMsg('chat-msg--user', escapeHtml(learn.qa[1].q));
    });
    later(6500 * T, () => {
      patchCard(learn.patch.file, learn.patch.summary);
      renderRows(renderPatch(codeFromLines(learn.code.starter), { replace: { line: 10, from, to } }));
      showDiffActions();
    });
    later(7800 * T, () => {
      hideDiffActions();
      renderCode(codeEl, learn.code.solved, learn.code.changedLines);
      railDone('learn', 2);
      animateCheck(learn.checkRows, learn.checkPass, () => {
        railDone('learn', 3);
        railDone('learn', 4);
        setStatus(learn.status);
        if (T) later(1400, playDebug);
      }, T);
    });
  };

  const playDebug = (staticMode) => {
    const T = staticMode ? 0 : 1;
    const { debug } = lessonDemo;
    clearTimers();
    setStage('debug');
    setFileTabs(debug.files, debug.file);
    setAttach(null);
    hideDiffActions();
    renderCode(codeEl, debug.code.starter);
    outputTest(`${debug.tests.fail}\n${debug.tests.failDetail}`, 'fail');
    setStatus('STATUS: reminders.js · 1 failed · 4 passed');
    chatLog.innerHTML = '';
    promptsEl.innerHTML = '';
    railDone('debug', 1);

    chatTyping(500 * T, 'chat-msg--ai', escapeHtml(debug.intro));
    later(1600 * T, () => {
      setAttach(debug.qa[0].attach);
      chatMsg('chat-msg--user', escapeHtml(debug.qa[0].q));
    });
    later(2700 * T, () => chatTyping(700 * T, 'chat-msg--ai', escapeHtml(debug.qa[0].a)));
    later(3600 * T, () => railDone('debug', 2));
    later(4300 * T, () => {
      // The learner fixes one line by hand, not by prompt.
      const starterLines = debug.code.starter.split('\n');
      const solvedLines = debug.code.solved.split('\n');
      typeLine(codeEl, starterLines, debug.code.changedLines[0], solvedLines[debug.code.changedLines[0] - 1], () => {        renderCode(codeEl, debug.code.solved, debug.code.changedLines);
        railDone('debug', 3);
        later(500 * T, () => {
          outputTest(debug.tests.pass, 'pass');
          railDone('debug', 4);
          setStatus(debug.status);
          if (T) later(1400, playProject);
        });
      }, T);
    });
  };

  const playProject = (staticMode) => {
    const T = staticMode ? 0 : 1;
    const { project } = lessonDemo;
    const readmeLines = project.readme.split('\n');
    clearTimers();
    setStage('project');
    setFileTabs(['README.md', project.file], 'README.md');
    setAttach(null);
    hideDiffActions();
    renderCode(codeEl, project.readme);
    outputPreview(project.previewBefore);
    setStatus('STATUS: README.md · 0/4 requirements complete');
    chatLog.innerHTML = '';
    promptsEl.innerHTML = '';

    chatTyping(500 * T, 'chat-msg--ai', `<p>${project.brief.map(escapeHtml).join('</p><p>')}</p>`);
    later(1800 * T, () => chatMsg('chat-msg--user', escapeHtml(project.qa[0].q)));
    later(2900 * T, () => chatTyping(700 * T, 'chat-msg--ai', `<p>${project.plan.map(escapeHtml).join('</p><p>')}</p>`));
    later(4000 * T, () => {
      setAttach(project.qa[1].attach);
      chatMsg('chat-msg--user', escapeHtml(project.qa[1].q));
    });
    later(4800 * T, () => {
      patchCard(project.patch.file, project.patch.summary);
      setFileTabs(['README.md', project.file], project.file);
      renderRows(renderPatch(codeFromLines(project.readme), { add: project.patchAdd }));
      showDiffActions();
    });
    later(5900 * T, () => {
      hideDiffActions();
      // Apply: the data model becomes part of the file.
      const appRows = [...codeFromLines(project.readme), ...project.patchAdd.map((text) => ({ text }))];
      renderRows(appRows);
      // The learner edits one line manually.
      const manualIndex = readmeLines.length + project.manualLine;
      const appLines = appRows.map((r) => r.text);
      typeLine(codeEl, appLines, manualIndex, project.manualText, () => {
        appLines[manualIndex - 1] = project.manualText;
        renderCode(codeEl, appLines.join('\n'), [manualIndex]);
        later(500 * T, () => {
          outputPreview(project.previewAfter);
          setStatus(project.status);
        });
      }, T);
    });
  };

  // Stage tabs: read-only inspection of the populated final state.
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    stop();
    const name = tab.dataset.stageTab;
    if (name === 'learn') playLearn(true);
    else if (name === 'debug') playDebug(true);
    else if (name === 'project') playProject(true);
  }));
  mobileTabs.forEach((t) => t.addEventListener('click', () => {
    if (ideBody) ideBody.dataset.mobileView = t.dataset.mobileTab;
    mobileTabs.forEach((x) => x.classList.toggle('is-active', x === t));
  }));

  // Run once when the section becomes visible; leave the final state in place.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !stopped) playLearn(false);
    }, { rootMargin: '80px' });
    observer.observe(section);
  } else {
    playLearn(false);
  }
}


// Inspired by sidstuff/moire (warped dual grids × multiply), but drawn as real
// vector/WebGL lines at device resolution — not a low-res bitmap blown up.
// https://github.com/sidstuff/moire
const MOIRE_REF = 888;

function moireF1(x, t, amp, spat) {
  return amp * (Math.sin(x / spat + t) ** 3 + Math.sin(Math.PI * x / (spat * 2)));
}
function moireF2(x, t, amp, spat) {
  return amp * (Math.cos(x / spat + t) ** 3 + Math.cos(Math.PI * x / (spat * 2)));
}

function moireWarpPoint(x, y, t, amp, spat, rowFn, colFn) {
  for (let pass = 0; pass < 2; pass++) {
    x += rowFn(y, t, amp, spat);
    y += colFn(x, t, amp, spat);
  }
  return [x, y];
}

// Full-res 2d fallback: stroke thin warped grids (no pixel buffer).
function drawMoireGrid(ctx, w, h, originX, spacing, offset, t, amp, spat, rowFn, colFn) {
  const step = Math.max(2, Math.round(spacing * 0.45));
  ctx.beginPath();
  for (let x = offset; x <= w + spacing; x += spacing) {
    for (let y = 0, first = true; y <= h; y += step) {
      const [px, py] = moireWarpPoint(x, y, t, amp, spat, rowFn, colFn);
      if (first) { ctx.moveTo(originX + px, py); first = false; }
      else ctx.lineTo(originX + px, py);
    }
  }
  for (let y = offset; y <= h + spacing; y += spacing) {
    for (let x = 0, first = true; x <= w; x += step) {
      const [px, py] = moireWarpPoint(x, y, t, amp, spat, rowFn, colFn);
      if (first) { ctx.moveTo(originX + px, py); first = false; }
      else ctx.lineTo(originX + px, py);
    }
  }
  ctx.stroke();
}

function initMoireWebGL(canvas) {
  // Probe first so a failed compile doesn't lock the real canvas away from 2d.
  const probe = document.createElement('canvas');
  const probeGl = probe.getContext('webgl', { alpha: false, antialias: true });
  if (!probeGl) return null;

  const vsSrc = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }',
  ].join('\n');

  // Sample each net after undoing the row→col warp (two passes). Thin lines via
  // distance-to-grid with smoothstep AA — period/thickness are CSS-pixel sized.
  const fsSrc = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform vec2 u_css;',
    'uniform float u_t;',
    'uniform float u_tB;',
    'uniform float u_amp;',
    'uniform float u_spat;',
    'uniform float u_period;',
    'uniform float u_thick;',
    'uniform float u_field0;',
    'float f1(float x, float t) {',
    '  return u_amp * (pow(sin(x/u_spat+t), 3.0) + sin(3.14159265*x/(u_spat*2.0)));',
    '}',
    'float f2(float x, float t) {',
    '  return u_amp * (pow(cos(x/u_spat+t), 3.0) + cos(3.14159265*x/(u_spat*2.0)));',
    '}',
    'vec2 unwarp(vec2 p, float t, float swap) {',
    '  for (int i = 0; i < 2; i++) {',
    '    if (swap < 0.5) { p.y -= f2(p.x, t); p.x -= f1(p.y, t); }',
    '    else { p.y -= f1(p.x, t); p.x -= f2(p.y, t); }',
    '  }',
    '  return p;',
    '}',
    'float netOpen(vec2 p, float phase) {',
    '  float dx = min(mod(p.x - phase, u_period), u_period - mod(p.x - phase, u_period));',
    '  float dy = min(mod(p.y - phase, u_period), u_period - mod(p.y - phase, u_period));',
    '  return smoothstep(0.0, u_thick, min(dx, dy));',
    '}',
    'void main() {',
    '  vec3 bg = vec3(0.039, 0.039, 0.035);',
    '  vec3 cream = vec3(0.957, 0.945, 0.918);',
    '  vec2 css = gl_FragCoord.xy * u_css / u_res;',
    '  if (css.x < u_field0) { gl_FragColor = vec4(bg, 1.0); return; }',
    '  float openA = netOpen(unwarp(css, u_t, 0.0), 0.0);',
    '  float openB = netOpen(unwarp(css, u_tB, 1.0), u_period * 0.5);',
    '  float lit = 1.0 - openA * openB;',
    '  gl_FragColor = vec4(mix(bg, cream, lit), 1.0);',
    '}',
  ].join('\n');

  const compile = (gl, type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };
  const link = (gl) => {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    return prog;
  };

  if (!link(probeGl)) {
    probeGl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
  probeGl.getExtension('WEBGL_lose_context')?.loseContext();

  // WebGL1 on purpose: gl_FragColor + attribute keep the shader tiny.
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, premultipliedAlpha: false });
  if (!gl) return null;
  const prog = link(gl);
  if (!prog) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uni = {
    res: gl.getUniformLocation(prog, 'u_res'),
    css: gl.getUniformLocation(prog, 'u_css'),
    t: gl.getUniformLocation(prog, 'u_t'),
    tB: gl.getUniformLocation(prog, 'u_tB'),
    amp: gl.getUniformLocation(prog, 'u_amp'),
    spat: gl.getUniformLocation(prog, 'u_spat'),
    period: gl.getUniformLocation(prog, 'u_period'),
    thick: gl.getUniformLocation(prog, 'u_thick'),
    field0: gl.getUniformLocation(prog, 'u_field0'),
  };

  return {
    draw(cssW, cssH, dpr, fieldStart, t, tB, amp, spat, period, thick) {
      const dw = Math.max(1, Math.round(cssW * dpr));
      const dh = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== dw || canvas.height !== dh) {
        canvas.width = dw;
        canvas.height = dh;
      }
      gl.viewport(0, 0, dw, dh);
      gl.useProgram(prog);
      gl.uniform2f(uni.res, dw, dh);
      gl.uniform2f(uni.css, cssW, cssH);
      gl.uniform1f(uni.t, t);
      gl.uniform1f(uni.tB, tB);
      gl.uniform1f(uni.amp, amp);
      gl.uniform1f(uni.spat, spat);
      gl.uniform1f(uni.period, period);
      gl.uniform1f(uni.thick, thick);
      gl.uniform1f(uni.field0, cssW * fieldStart);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
  };
}

function initMoire() {
  const visual = document.getElementById('moire-visual');
  const canvas = document.getElementById('moire-canvas');
  if (!visual || !canvas) return;

  const FIELD_START = 0.08;
  const FRAME_MS = reduceMotion ? 80 : 48;
  // Finer than sidstuff's 2px-on-8: ~0.7px strokes on a 5px lattice.
  const PERIOD = 5;
  const THICK = 0.7;

  let raf = 0;
  let timer = 0;
  let visible = false;
  let cssW = 0;
  let cssH = 0;
  let lastNow = 0;
  let rebuildTimer = 0;
  let dpr = 1;

  // Organic drift: ease toward random targets every few seconds — wanders,
  // doesn't stutter. rate is rad/ms; amp/spat stay near the base look.
  const drift = {
    t: 0,
    tB: 0.4,
    rate: reduceMotion ? 0.00035 : 0.0007,
    rateB: reduceMotion ? 0.00028 : 0.00055,
    trate: reduceMotion ? 0.00035 : 0.0007,
    trateB: reduceMotion ? 0.00028 : 0.00055,
    ampMul: 1,
    spatMul: 1,
    tamp: 1,
    tspat: 1,
    nextAt: 0,
  };
  const randRange = (min, max) => min + Math.random() * (max - min);
  const retargetDrift = (now) => {
    const slow = reduceMotion ? 0.55 : 1;
    drift.trate = randRange(0.0003, 0.00105) * slow;
    drift.trateB = randRange(0.00022, 0.00095) * slow;
    // Occasionally reverse so the field breathes both ways without snapping.
    if (Math.random() < 0.22) drift.trate *= -1;
    if (Math.random() < 0.22) drift.trateB *= -1;
    drift.tamp = randRange(0.85, 1.2);
    drift.tspat = randRange(0.9, 1.15);
    drift.nextAt = now + randRange(1600, 3800);
  };

  const gpu = initMoireWebGL(canvas);
  const ctx = gpu ? null : canvas.getContext('2d', { alpha: false });
  if (!gpu && !ctx) return;

  const params = () => {
    const longEdge = Math.max(cssW * (1 - FIELD_START), cssH);
    const scale = longEdge / MOIRE_REF;
    return {
      amp: 14 * scale * drift.ampMul,
      spat: 100 * scale * drift.spatMul,
      period: PERIOD,
      thick: THICK,
    };
  };

  const paint = (now) => {
    if (!cssW || !cssH) return;
    if (!lastNow) lastNow = now;
    const dt = Math.min(100, Math.max(0, now - lastNow));
    lastNow = now;

    if (now >= drift.nextAt) retargetDrift(now);
    const ease = reduceMotion ? 0.018 : 0.03;
    drift.rate += (drift.trate - drift.rate) * ease;
    drift.rateB += (drift.trateB - drift.rateB) * ease;
    drift.ampMul += (drift.tamp - drift.ampMul) * ease;
    drift.spatMul += (drift.tspat - drift.spatMul) * ease;
    drift.t += drift.rate * dt;
    drift.tB += drift.rateB * dt;

    const { amp, spat, period, thick } = params();
    const t = drift.t;
    const tB = drift.tB;

    if (gpu) {
      gpu.draw(cssW, cssH, dpr, FIELD_START, t, tB, amp, spat, period, thick);
      return;
    }

    const dw = Math.max(1, Math.round(cssW * dpr));
    const dh = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0a09';
    ctx.fillRect(0, 0, cssW, cssH);

    const dx = cssW * FIELD_START;
    const fieldW = cssW - dx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, 0, fieldW, cssH);
    ctx.clip();
    ctx.lineWidth = thick;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(244, 241, 234, 0.42)';
    drawMoireGrid(ctx, fieldW, cssH, dx, period, 0, t, amp, spat, moireF1, moireF2);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(244, 241, 234, 0.55)';
    drawMoireGrid(ctx, fieldW, cssH, dx, period, period * 0.5, tB, amp, spat, moireF2, moireF1);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  };

  const tick = (now) => {
    raf = 0;
    if (!visible) return;
    paint(now);
    timer = window.setTimeout(() => {
      timer = 0;
      if (visible) raf = requestAnimationFrame(tick);
    }, FRAME_MS);
  };

  const play = () => {
    if (raf || timer || !visible) return;
    lastNow = 0;
    raf = requestAnimationFrame(tick);
  };
  const pause = () => {
    if (raf) cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
    raf = 0;
    timer = 0;
  };

  const resize = () => {
    const rect = visual.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);
    if (nextW === cssW && nextH === cssH && nextDpr === dpr && (gpu || canvas.width)) return;
    cssW = nextW;
    cssH = nextH;
    dpr = nextDpr;
    if (!gpu) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    if (visible) paint(performance.now());
  };

  const scheduleResize = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(resize, 120);
  };

  resize();
  if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleResize).observe(visual);
  } else {
    window.addEventListener('resize', scheduleResize, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) play();
      else pause();
    }, { rootMargin: '80px' });
    observer.observe(visual);
  } else {
    visible = true;
    play();
  }
}

// The closing wave renders as bits at the art's own 121x43 grid: filled cells
// show a 1/0 glyph, empty cells stay blank — the shape comes from where the
// digits are, not from brightening the background. A quarter of the filled
// cells flip every second, so half the wave changes within any two seconds,
// and each flipped bit flashes white while settling. Pulses overlap
// asynchronously, so the wave shimmers continuously instead of strobing in
// sync. Sizing is pure CSS — the wave keeps a natural sub-width, never fitted
// to the section edges, so first paint equals steady state. The static braille
// art stays in the markup and is replaced here, so a no-JS page still shows
// the wave.
// 25% of filled cells flip per second: half the wave changes every 2s.
// Reduced motion drops to 8% per second — still alive, just calmer.
const WAVE_FLIP_RATE_PER_SECOND = 0.25;
const WAVE_FLIP_RATE_PER_SECOND_REDUCED = 0.08;

function decodeWaveBits(art) {
  return art.split('\n').map((line) =>
    [...line].map((ch) => (ch === ' ' || ch === '\u2800' ? 0 : 1))
  );
}

function initBinaryWave() {
  const pre = document.querySelector('.waitlist-wave-art');
  if (!pre) return;
  // The art file ends with a newline; drop the trailing empty row it decodes to.
  const bits = decodeWaveBits(pre.textContent).filter((row) => row.length);
  const width = Math.max(...bits.map((row) => row.length));
  const rows = bits.length;
  if (!rows || !width) return;

  const filled = [];
  const cells = [];
  // 1 = wave cell currently showing '1'. Blank cells never flip.
  const vals = new Uint8Array(width * rows);
  const frag = document.createDocumentFragment();
  for (let y = 0; y < rows; y++) {
    const row = bits[y];
    for (let x = 0; x < width; x++) {
      const cell = document.createElement('span');
      if (row[x] === 1) {
        // Start as a random 50/50 mix; the flip loop keeps it there.
        const one = Math.random() < 0.5;
        cell.className = 'bit';
        cell.textContent = one ? '1' : '0';
        vals[cells.length] = one ? 1 : 0;
        filled.push(cells.length);
      } else {
        cell.className = 'bit--blank';
        cell.textContent = ' ';
      }
      frag.appendChild(cell);
      cells.push(cell);
    }
    if (y < rows - 1) frag.appendChild(document.createTextNode('\n'));
  }
  pre.replaceChildren(frag);

  // A re-flipped cell must not carry a finished pulse into the next one.
  pre.addEventListener('animationend', (e) => {
    if (e.target.classList?.contains('bit--pulse')) e.target.classList.remove('bit--pulse');
  });

  // The wave never stops flickering: a requestAnimationFrame loop trickles
  // bits at a steady per-second rate, so changes arrive a few per frame
  // instead of in one batch per timer tick — continuous, never strobing.
  const rate = reduceMotion ? WAVE_FLIP_RATE_PER_SECOND_REDUCED : WAVE_FLIP_RATE_PER_SECOND;
  let last = performance.now();
  let pending = 0;
  const tick = (now) => {
    // Clamp the gap after a hidden tab so it can't dump a huge batch at once.
    const dt = Math.min(now - last, 100);
    last = now;
    pending += filled.length * rate * dt / 1000;
    const flips = Math.floor(pending);
    pending -= flips;
    if (flips) {
      // Flip the majority toward balance, so the wave settles into a stable
      // half-1s/half-0s texture instead of draining one way.
      const ones = [];
      const zeros = [];
      for (const i of filled) (vals[i] ? ones : zeros).push(i);
      const pool = ones.length >= zeros.length ? ones : zeros;
      if (pool.length) {
        for (let i = 0; i < flips; i++) {
          const pos = pool[(Math.random() * pool.length) | 0];
          vals[pos] ^= 1;
          const cell = cells[pos];
          cell.textContent = vals[pos] ? '1' : '0';
          // Keep a mid-pulse glow running; only start a new one on a settled
          // cell, so pulses overlap asynchronously. animationend removes it.
          if (!cell.classList.contains('bit--pulse')) cell.classList.add('bit--pulse');
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
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

// Fade / slide-in on scroll. Gated by <html class="js"> so no-JS never hides copy.
function initReveal() {
  document.documentElement.classList.add('js');
  const nodes = [...document.querySelectorAll('[data-reveal]')];
  if (!nodes.length) return;

  const show = (el) => el.classList.add('is-in');

  if (!('IntersectionObserver' in window)) {
    nodes.forEach(show);
    return;
  }

  // Generous margins: content fades in while it is still below the fold, so
  // it is already fully visible by the time it scrolls on screen. Nothing
  // fades out once in.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle('is-in', entry.isIntersecting);
    }
  }, { rootMargin: '0px 0px 15% 0px', threshold: 0.05 });

  nodes.forEach((el) => observer.observe(el));
}

// Teaching-session carousel. Desktop gets a flat coverflow: the active
// slide sits front and centre, its neighbours peek out at the edges, faded
// into the page by a gallery mask, and clicking a preview jumps to it.
// Below 901px — and for no-JS readers — the same track is a plain scroll-snap
// swipe. Arrows and dots drive either mode, and a timer advances it while it
// is on screen. Hover, focus, touch, and reduced motion all stop the timer.
function initTeachingCarousel() {
  const gallery = document.querySelector('[data-carousel]');
  if (!gallery) return;
  const track = gallery.querySelector('[data-carousel-track]');
  const prev = gallery.querySelector('[data-carousel-prev]');
  const next = gallery.querySelector('[data-carousel-next]');
  const dotsEl = gallery.querySelector('[data-carousel-dots]');
  if (!track || !prev || !next || !dotsEl) return;
  const slides = [...track.children];
  if (slides.length < 2) return;

  // The coverflow is desktop-only; its geometry mirrors styles.css.
  const coverflow = window.matchMedia('(min-width: 901px)');
  const TRANSLATE_PCT = 46; // % of slide width per offset step
  const SCALE_STEP = 0.2; // shrink per offset step
  const FADE_STEP = 0.55; // opacity factor per offset step

  const dots = slides.map((slide, i) => {
    const dot = document.createElement('li');
    dot.innerHTML = `<button type="button" class="carousel-dot" aria-label="Go to teaching session ${i + 1}"></button>`;
    dot.firstElementChild.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
    return dot;
  });
  const dotEls = () => [...dotsEl.querySelectorAll('.carousel-dot')];

  let index = 0;
  const updateDots = () => dotEls().forEach((d, i) => d.classList.toggle('is-active', i === index));

  // Shortest distance from index, wrapped: the next slide always enters from
  // the right and the previous leaves to the left, even across the loop.
  const offsetOf = (i) => {
    const wrap = ((i - index + slides.length) % slides.length + slides.length) % slides.length;
    return wrap > slides.length / 2 ? wrap - slides.length : wrap;
  };

  const render = () => {
    slides.forEach((slide, i) => {
      const o = offsetOf(i);
      const d = Math.abs(o);
      slide.style.transform = `translateX(${o * TRANSLATE_PCT}%) scale(${Math.max(0.15, 1 - d * SCALE_STEP)})`;
      slide.style.opacity = String(Math.pow(FADE_STEP, d));
      slide.style.zIndex = String(6 - d);
      slide.style.pointerEvents = d <= 1 ? 'auto' : 'none';
      slide.dataset.offset = String(o);
      slide.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
      slide.classList.toggle('is-clickable', d === 1);
    });
  };

  const clearCoverflow = () => {
    slides.forEach((slide) => {
      slide.removeAttribute('style');
      slide.removeAttribute('data-offset');
      slide.removeAttribute('aria-hidden');
      slide.classList.remove('is-clickable');
    });
  };

  const goTo = (i) => {
    index = (i + slides.length) % slides.length;
    if (coverflow.matches) {
      render();
    } else {
      track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    updateDots();
  };

  track.addEventListener('scroll', () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index) {
      index = i;
      updateDots();
    }
  }, { passive: true });

  slides.forEach((slide) => {
    slide.addEventListener('click', () => {
      if (coverflow.matches && slide.dataset.offset) goTo(index + Number(slide.dataset.offset));
    });
  });

  prev.addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => goTo(index + 1));
  updateDots();

  if (coverflow.matches) render();
  coverflow.addEventListener('change', () => {
    if (coverflow.matches) {
      render();
    } else {
      clearCoverflow();
      track.scrollTo({ left: index * track.clientWidth, behavior: 'auto' });
    }
  });

  if (reduceMotion) return;

  const AUTOPLAY_MS = 5000;
  let timer = 0;
  const play = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), AUTOPLAY_MS);
  };
  const pause = () => clearInterval(timer);

  let touchX = 0;
  gallery.addEventListener('mouseenter', pause);
  gallery.addEventListener('mouseleave', play);
  gallery.addEventListener('focusin', pause);
  gallery.addEventListener('focusout', play);
  gallery.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
    pause();
  }, { passive: true });
  gallery.addEventListener('touchend', (e) => {
    play();
    if (!coverflow.matches) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) play();
      else pause();
    }, { rootMargin: '80px' });
    observer.observe(gallery);
  } else {
    play();
  }
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
initReveal();
initBirds();
initLessonDemo();
initMoire();
initBinaryWave();
initTeachingCarousel();
initNav();
initWaitlist();
