// kolibri.alignment.id — early-access page + waitlist webhook relay.
// Zero-dependency Node server, same pattern as vstal.in/server/form-server.js.
//
//   GET  /*              -> static files from this directory
//   POST /api/waitlist   -> {email} (JSON or form-encoded) -> Discord webhook
//
// Env:
//   PORT                 (default 3001)
//   HOST                 (default 127.0.0.1 — nginx proxies to this)
//   DISCORD_WEBHOOK_URL  (required for /api/waitlist; 503 without it)
//
// Self-check: node server.js --selftest

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 4096;
const RATE_LIMIT_MAX = 5;          // requests…
const RATE_LIMIT_WINDOW_MS = 3600e3; // …per hour per IP

// Teaching-session carousel assets, shared by the page build and the selftest.
const teachingAssets = [
  'teaching-2026-06-06.jpg',
  'teaching-2026-06-07-1.jpg',
  'teaching-2026-06-07-2.jpg',
  'teaching-2026-06-17-1.jpg',
  'teaching-2026-06-17-2.jpg',
  'teaching-2026-07-05-1.jpg',
  'teaching-2026-07-05-2.jpg',
  'teaching-2026-07-16.jpg',
  'teaching-2026-07-20.webp',
];

// ponytail: in-memory rate limit, fine for a single-process early-access page.
// Upgrade path: redis bucket if this ever runs multi-instance.
const hits = new Map(); // ip -> number[] (timestamps)

function isRateLimited(ip, now = Date.now()) {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const list = (hits.get(ip) || []).filter((t) => t > cutoff);
  if (list.length >= RATE_LIMIT_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'content-type': CONTENT_TYPES[ext] || 'application/octet-stream' };
    // Cloudflare fronts this origin and honours these. The page and its
    // hand-edited sources must revalidate every time or a deploy never lands;
    // /assets is content-stable and the vendored build is version-named.
    if (filePath.includes(`${path.sep}vendor${path.sep}`)) {
      headers['cache-control'] = 'public, max-age=31536000, immutable';
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      headers['cache-control'] = 'public, max-age=86400';
    } else {
      headers['cache-control'] = 'no-cache';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function notifyDiscord(email, fetchImpl = globalThis.fetch) {
  const res = await fetchImpl(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'Kolibri waitlist',
      content: `New waitlist signup: ${email}`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`discord webhook failed: ${res.status} ${detail.slice(0, 200)}`);
  }
}

// Accepts both the fetch body the page sends ({email}) and the native
// application/x-www-form-urlencoded submit an HTML form makes without JS.
function emailFromBody(raw, contentType = '') {
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const email = new URLSearchParams(raw).get('email');
    return typeof email === 'string' ? email.trim() : '';
  }
  const parsed = JSON.parse(raw);
  return typeof parsed.email === 'string' ? parsed.email.trim() : '';
}

async function handleWaitlist(req, res) {
  let email;
  try {
    const raw = await readBody(req);
    email = emailFromBody(raw, req.headers['content-type'] || '');
  } catch {
    sendJson(res, 400, { ok: false, error: 'invalid body' });
    return;
  }

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    sendJson(res, 400, { ok: false, error: 'invalid email' });
    return;
  }

  if (!WEBHOOK_URL) {
    sendJson(res, 503, { ok: false, error: 'webhook not configured' });
    return;
  }
  if (isRateLimited(clientIp(req))) {
    sendJson(res, 429, { ok: false, error: 'rate limited' });
    return;
  }

  try {
    await notifyDiscord(email);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err.message);
    sendJson(res, 502, { ok: false, error: 'webhook failed' });
  }
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/waitlist') {
      handleWaitlist(req, res);
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res);
      return;
    }
    res.writeHead(405, { allow: 'GET, HEAD, POST' });
    res.end();
  });
}

function selftest() {
  const assert = require('assert');

  assert.ok(EMAIL_RE.test('a@b.co'), 'valid email passes');
  assert.ok(!EMAIL_RE.test('nope'), 'rejects no-at');
  assert.ok(!EMAIL_RE.test('a@b'), 'rejects no TLD');
  assert.ok(!EMAIL_RE.test('a b@c.co'), 'rejects spaces');

  let now = 1000;
  hits.clear();
  for (let i = 0; i < RATE_LIMIT_MAX; i++) {
    assert.strictEqual(isRateLimited('1.2.3.4', now), false, `hit ${i + 1} allowed`);
  }
  assert.strictEqual(isRateLimited('1.2.3.4', now), true, 'hit 6 blocked');
  assert.strictEqual(isRateLimited('5.6.7.8', now), false, 'other IP unaffected');
  now += RATE_LIMIT_WINDOW_MS + 1;
  assert.strictEqual(isRateLimited('1.2.3.4', now), false, 'window resets');

  const traversal = path.normalize(path.join(ROOT, '/../etc/passwd'));
  assert.ok(!traversal.startsWith(ROOT), 'traversal escapes root detected');

  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('/api/waitlist'), 'page posts to waitlist');
  assert.ok(indexHtml.includes('Learn programming by solving a problem you already have.'), 'hero headline present');
  assert.ok(indexHtml.includes('AI can write the code.'), 'concepts section present');
  assert.ok(indexHtml.includes('id="moire-visual"'), 'moire concepts visual present');
  assert.ok(indexHtml.includes('id="moire-canvas"'), 'moire is a full-bleed canvas field');
  assert.ok(!indexHtml.includes('data-field="a"'), 'old SVG moire fields removed');
  assert.ok(!indexHtml.includes('moire-index'), 'moire instrument caption removed');
  assert.ok(!indexHtml.includes('data-situation'), 'interactive concept map removed');
  assert.ok(indexHtml.includes('Lessons give you less help as you go.'), 'lesson section present');
  assert.ok(indexHtml.includes('class="lesson-intro"'), 'lesson copy above the demo present');
  assert.ok(indexHtml.includes('/assets/javascript.svg'), 'real JS logo in the workspace badge');
  assert.ok(indexHtml.includes('data-stage-tab="learn"'), 'IDE learn stage present');
  assert.ok(indexHtml.includes('data-stage-tab="debug"'), 'IDE debug stage present');
  assert.ok(indexHtml.includes('data-stage-tab="project"'), 'IDE project stage present');
  assert.ok(indexHtml.includes('id="demo-chat"'), 'Kolibri AI chat present');
  assert.ok(indexHtml.includes('id="demo-input"'), 'final project takes a typed problem');
  assert.ok(indexHtml.includes('id="demo-status"'), 'IDE status bar present');
  assert.ok(indexHtml.includes('class="js-badge"'), 'workspace JS badge present');
  assert.ok(indexHtml.includes('data-mobile-tab'), 'mobile Code/Output/AI tabs present');
  assert.ok(indexHtml.includes('reminders.test.js'), 'debug stage file list present');
  assert.ok(indexHtml.includes('README.md'), 'project stage file list present');
  assert.ok(!indexHtml.includes('Find a useful first version'), 'old generate button removed');
  assert.ok(!indexHtml.includes('armature'), 'three.js armature removed');
  assert.ok(!indexHtml.includes('id="independent"'), 'independence section removed');
  assert.ok(!indexHtml.includes('van-gogh'), 'Van Gogh painting removed');
  assert.ok(!indexHtml.includes('SHARED EXPENSE CHECKER'), 'project concept section removed');
  assert.ok(indexHtml.includes('What exists now'), 'current state section present');
  assert.ok(indexHtml.includes('data-carousel-track'), 'teaching carousel track present');
  assert.strictEqual((indexHtml.match(/<li class="teaching-slide(?:\s|">)/g) || []).length, 9, 'nine teaching sessions in the carousel');
  assert.ok(
    /<li class="teaching-slide teaching-slide--people">\s*<img src="\/assets\/teaching-2026-06-06\.jpg"/.test(indexHtml),
    'June 6 session uses the people crop'
  );
  assert.ok(!indexHtml.includes('poster-figure'), 'poster figure replaced by the teaching carousel');
  for (const file of teachingAssets) {
    assert.ok(fs.existsSync(path.join(ROOT, 'assets', file)), `${file} exists`);
    assert.ok(indexHtml.includes(`/assets/${file}`), `${file} referenced in the carousel`);
  }
  assert.strictEqual((indexHtml.match(/<form class="waitlist"/g) || []).length, 1, 'one waitlist form present');
  assert.ok(indexHtml.includes('Follow the online course build'), 'waitlist heading present');
  assert.ok(indexHtml.includes('waitlist-wave-art'), 'wave beside waitlist');
  assert.ok(indexHtml.includes('aria-hidden="true"'), 'decorative art is hidden from assistive technology');
  assert.ok(!indexHtml.includes('Help without taking over'), 'help section removed');
  assert.ok(!indexHtml.includes('A lesson should leave the lesson'), 'application section removed');
  assert.ok(!indexHtml.includes('Progress is becoming less dependent'), 'progress section removed');
  assert.ok(indexHtml.includes('monet-impression-sunrise.webp'), 'Monet behind lesson panel referenced');
  assert.ok(!indexHtml.includes('vibe-coding-dari-nol-poster.png'), 'poster no longer referenced in markup');
  assert.ok(indexHtml.includes('vstal.in/portfolio'), 'portfolio link present');
  assert.ok(!indexHtml.includes('Small cohorts near UI'), 'in-person-first positioning removed');
  assert.ok(!indexHtml.includes('class="closing-art"'), 'standalone closing art removed');
  assert.ok(indexHtml.includes('https://kolibri.alignment.id'), 'nav KOLIBRI link present');
  assert.ok(indexHtml.includes('https://alignment.id/hire'), 'nav HIRE link present');
  assert.ok(indexHtml.includes('https://vstal.in'), 'nav VSTAL.IN link present');
  assert.ok(!indexHtml.includes('class="nav-separator"'), 'nav separator removed');
  assert.ok(!indexHtml.includes('nav-action'), 'nav action pill removed');
  assert.ok(indexHtml.includes('grayaiwhitenotspinning.svg'), 'gray workspace CTA icon present');
  assert.strictEqual((indexHtml.match(/data-nav/g) || []).length, 0, 'section scroll-spy links removed from nav');
  assert.ok(indexHtml.includes('site-footer__overlay'), 'marketing footer overlay present');
  assert.ok(indexHtml.includes('site-footer__social-row'), 'footer social row present');
  assert.ok(
    /site-footer__column-link[^>]*>\s*Kolibri\s*</.test(indexHtml),
    'kolibri links itself in the shared footer'
  );
  assert.ok(indexHtml.includes('/logos/xwhite.svg'), 'footer social icons present');
  assert.ok(!indexHtml.includes('site-footer__language'), 'language toggle omitted on EN-only page');
  assert.ok(indexHtml.includes('/astronaut.jpg'), 'footer background image present');
  for (const asset of [
    'logos/xwhite.svg',
    'logos/youtubewhite.svg',
    'logos/instagramwhite.svg',
    'logos/discordwhite.svg',
    'astronaut.jpg',
    'assets/grayaiwhitenotspinning.svg',
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, asset)), `${asset} exists`);
  }

  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.ok(appJs.includes('setInterval(tick, FRAME_MS)'), 'hummingbird animation loop present');
  assert.ok(
    appJs.includes('FRAME_MS = 1000 / (reduceMotion ? 12 : 24)'),
    'reduced motion halves the flap rate rather than freezing it'
  );
  assert.ok(appJs.includes('if (!reduceMotion && birdWrap)'), 'reduced-motion request drops the pointer parallax');
  assert.ok(appJs.includes('initMoireWebGL'), 'moire prefers a full-res WebGL shader');
  assert.ok(appJs.includes('drawMoireGrid'), 'moire falls back to stroked full-res grids');
  assert.ok(appJs.includes('moireWarpPoint') || appJs.includes('unwarp'), 'moire warps grid samples');
  assert.ok(appJs.includes('Math.sin(x / spat + t) ** 3') || appJs.includes('pow(sin(x/u_spat+t), 3.0)'), 'moire uses cubic sine warp like sidstuff/moire');
  assert.ok(appJs.includes('openA * openB') || appJs.includes('globalCompositeOperation = \'screen\''), 'moire combines two offset nets');
  assert.ok(appJs.includes('PERIOD = 5') && appJs.includes('THICK = 0.7'), 'moire lines are thinner than the PIL 2px-on-8 bars');
  assert.ok(appJs.includes('devicePixelRatio'), 'moire renders at device pixel ratio');
  assert.ok(appJs.includes('IntersectionObserver'), 'moire pauses when off-screen');
  assert.ok(appJs.includes("getContext('webgl'") || appJs.includes("getContext('2d'"), 'moire draws on canvas');
  assert.ok(
    styles.includes('.hero') && /\.hero\s*\{[^}]*min-height:\s*(?:100dvh|calc\(100dvh\s*-\s*4\.05rem\))/.test(styles),
    'hero fills the viewport area'
  );
  assert.ok(styles.includes('min-height: 100dvh') && styles.includes('.moire-section'), 'moire section fills the viewport');
  assert.ok(indexHtml.includes('id="moire-canvas"'), 'moire canvas present in markup');
  assert.ok(/moire-visual::after[\s\S]*48%/.test(styles), 'moire fades left-to-right softly');
  assert.ok(styles.includes('mask-image'), 'moire canvas uses a soft mask instead of a hard clip wall');
  assert.ok(!styles.includes('var(--kolibri-bg) 28%'), 'hard mid-screen black wall removed');
  assert.ok(appJs.includes('FIELD_START'), 'moire field start is defined');
  assert.ok(appJs.includes('FIELD_START = 0.08'), 'moire extends under the fade instead of clipping mid-screen');
  assert.ok(!styles.includes('situation-btn'), 'concept map styles removed');
  assert.ok(!styles.includes('nav-action'), 'nav action pill styles removed');
  assert.ok(!styles.includes('motion-toggle'), 'motion toggle styles removed');
  assert.ok(styles.includes('nav-separator'), 'nav separator styles present');
  assert.ok(styles.includes('site-footer__overlay'), 'marketing footer styles present');
  assert.ok(appJs.includes('hsl(200, 95%,') && appJs.includes('text-shadow: 0 0 '), 'blue hue and per-glyph glow ported from the source viewers');
  assert.ok(/\.bird\s*\{[^}]*hsl\(200, 95%/.test(styles), 'hero bird glows blue before hydration');
  assert.ok(/\.bloom-art\s*\{[^}]*hsl\(200, 95%/.test(styles), 'closing bloom glows blue before hydration');
  // /assets is cacheable, so a dataset only reaches visitors if its URL moves
  // with its contents — the reason a first deploy of new frames served the old
  // animation from cache.
  assert.ok(appJs.includes('new URL(import.meta.url).search'), 'frame data inherits the versioned app.js URL');
  const buildPage = fs.readFileSync(path.join(ROOT, 'build-page.js'), 'utf8');
  assert.ok(
    /jsVersion = hash\([^)]*hummingbird-feeding_data\.js[^)]*hummingbird-hover_data\.js/s.test(buildPage),
    'both datasets are part of the script version hash'
  );
  assert.ok(indexHtml.includes('#lessons{position:relative;overflow:hidden}'), 'inline guard keeps the painting inside its section');
  assert.ok(appJs.includes('fitAsciiArt'), 'ascii art is measured and fitted to its column');
  assert.ok(!indexHtml.includes('id="motion-toggle"'), 'motion control removed from beside the hummingbird');
  assert.ok(!buildPage.includes('id="motion-toggle"'), 'motion control removed from page builder');
  assert.ok(!/overflow-x:\s*(auto|scroll)/.test(styles.replace(/\.teaching-track\s*\{[^}]*\}/g, '')), 'no page-level horizontal scrollbars in stylesheet');
  assert.ok(/@media \(min-width: 901px\)[\s\S]*html\.js \.teaching-stage[\s\S]*perspective:\s*1100px/.test(styles), 'coverflow stage gets 3D perspective on desktop');
  assert.ok(/@media \(min-width: 901px\)[\s\S]*html\.js \.teaching-stage\s*\{[^}]*overflow:\s*visible/.test(styles), 'coverflow previews peek out of the stage');
  assert.ok(styles.includes('html.js .teaching-slide:not([data-offset="0"]) .teaching-caption'), 'coverflow hides captions on preview slides');
  assert.ok(appJs.includes("const coverflow = window.matchMedia('(min-width: 901px)')"), 'coverflow is gated to desktop');
  assert.ok(appJs.includes('scale('), 'coverflow slides shrink as they recede');
  assert.ok(styles.includes('mask-image: linear-gradient(90deg'), 'coverflow previews fade into the page edges');
  assert.ok(/\.teaching-slide\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/.test(styles), 'every teaching slide is a uniform 4:3 card');
  assert.ok(styles.includes('.teaching-slide--people img { object-position: center 30%; }'), 'June 6 crop keeps the people visible');
  assert.ok(/\.teaching-slide\s*\{[^}]*overflow:\s*hidden/.test(styles), 'teaching captions stay clipped to their card');
  assert.ok(!appJs.includes('slide.style.aspectRatio'), 'per-slide aspect ratios removed; the 4:3 crop is a CSS constant');
  assert.ok(styles.includes('scroll-snap-align: center'), 'mobile snap centres the active slide for the 3D pose');
  assert.ok(appJs.includes('perspective(900px)'), 'mobile slides get per-image 3D perspective');
  assert.ok(appJs.includes('track.prepend(copy)'), 'the mobile loop wraps backwards through pre-cloned slides');
  assert.ok(
    /\.ide-body\s*\{[\s\S]*?height:\s*34rem;[\s\S]*?clamp\(34rem,\s*calc\(100vh - 17rem\),\s*52rem\)/.test(styles),
    'ide frame height is locked with a rem fallback so the demo cannot expand it'
  );
  assert.ok(!styles.includes('100dvh - 21rem'), 'ide frame no longer depends on dvh');
  assert.ok(
    /\.ide-body\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\)/.test(styles),
    'ide row is an fr track so panes can never grow the frame'
  );
  assert.ok(
    /@media \(max-width: 900px\)[\s\S]*?\.ide-workspace\s*\{[\s\S]*?height:\s*28rem/.test(styles),
    'mobile workspace height is locked so the demo cannot grow the section'
  );
  assert.ok(!styles.includes('waitlist-wave-scroll'), 'wave scroll wrapper removed');
  assert.ok(/#lessons\s*\{[^}]*overflow:\s*hidden/.test(styles), 'lesson section clips its painting');
  assert.ok(appJs.includes('initLessonDemo'), 'lesson demo wiring present');
  assert.ok(appJs.includes('typeIntoInput'), 'final project typing is simulated, not live');
  assert.ok(appJs.includes('learn.code.solved'), 'autoplay swaps in the solved rule');
  assert.ok(appJs.includes('playDebug'), 'debug stage fails then fixes itself');
  const pageContent = fs.readFileSync(path.join(ROOT, 'page-content.js'), 'utf8');
  assert.ok(pageContent.includes('Short bug report: a reminder dated yesterday still appears as upcoming'), 'debug bug report present');
  assert.ok(pageContent.includes('5 passed · all green'), 'debug pass verdict present');
  assert.ok(pageContent.includes('changedLines: [10]'), 'changed lines are declared');
  const wave = fs.readFileSync(path.join(ROOT, 'assets', 'kolibri-closing-art.txt'), 'utf8');
  assert.ok(indexHtml.includes(wave), 'closing art preserved byte-for-byte');
  assert.ok(appJs.includes('initBinaryWave'), 'wave renders as animated binary');
  assert.ok(appJs.includes('decodeWaveBits'), 'wave decodes braille cells to bits');
  assert.ok(appJs.includes('initReveal'), 'scroll reveal wiring present');
  assert.ok(styles.includes('[data-reveal]'), 'reveal styles present');
  assert.ok(indexHtml.includes('data-reveal'), 'reveal hooks present in markup');
  assert.ok(styles.includes('--rows: 43') && styles.includes('100cqh'), 'wave height-fits the section');
  assert.ok(!indexHtml.includes('data-ascii-cover'), 'wave sizing is pure CSS, not JS');
  assert.ok(appJs.includes("'bit--blank'"), 'empty cells stay blank');
  assert.ok(styles.includes('.bit--pulse'), 'flipped bits pulse');
  assert.ok(/\.waitlist-wave\s*\{[^}]*waitlist-fade/.test(styles), 'wave fades; copy stays full opacity');
  assert.ok(/\.waitlist-section\s*\{[^}]*border-top:\s*none/.test(styles), 'waitlist divider line removed');
  assert.ok(!styles.includes('wave-sway'), 'wave sway animation removed');
  assert.ok(indexHtml.includes('id="bird"') && indexHtml.includes('id="bloom"'), 'hummingbird in the hero and bloom closing the page');

  // An animation is only as alive as its data: a truncated or collapsed dataset
  // renders a bird that never moves, which is the bug this page keeps regressing
  // into. Parse both assets and prove they hold real, varied frames, and that
  // each bird's markup ships its own animation's first frame.
  for (const [slug, exportName] of [
    ['hummingbird-feeding', 'hummingbirdFeeding'],
    ['hummingbird-hover', 'hummingbirdHover'],
  ]) {
    const dataSrc = fs.readFileSync(path.join(ROOT, 'assets', `${slug}_data.js`), 'utf8');
    const animation = JSON.parse(dataSrc.slice(dataSrc.indexOf('{', dataSrc.indexOf(`${exportName} =`)), dataSrc.lastIndexOf('};') + 1));
    assert.ok(animation.frames.length > 1, `${slug} holds more than one frame`);
    assert.ok(new Set(animation.frames.map((f) => f.ascii)).size > 1, `${slug} frames actually differ from each other`);
    for (const frame of animation.frames) {
      const lines = frame.ascii.split('\n');
      assert.strictEqual(lines.length, animation.height, `every ${slug} frame is the declared height`);
      assert.ok(lines.every((l) => l.length === animation.width), `every ${slug} row is the declared width`);
      assert.strictEqual(frame.brightness.length, animation.height, `every ${slug} frame carries a full brightness grid`);
    }
    const frame0 = fs.readFileSync(path.join(ROOT, 'assets', `${slug}-frame0.txt`), 'utf8');
    assert.strictEqual(animation.frames[0].ascii, frame0, `${slug}'s no-JS frame is its own first frame`);
    assert.ok(indexHtml.includes(frame0), `${slug}'s first frame is in the page byte-for-byte`);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets', 'van-gogh-starry-night-rhone.webp')), 'Van Gogh asset removed');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'monet-water-lilies.webp')), 'Monet asset exists');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'monet-impression-sunrise.webp')), 'lesson-panel Monet asset exists');

  assert.ok(/styles\.css\?v=[0-9a-f]{10}/.test(indexHtml), 'stylesheet URL is content-versioned past the CDN');
  assert.ok(/app\.js\?v=[0-9a-f]{10}/.test(indexHtml), 'script URL is content-versioned past the CDN');
  assert.ok(!appJs.includes('scene.js'), 'three.js scene removed from the app');
  assert.ok(!fs.existsSync(path.join(ROOT, 'scene.js')), 'scene.js file removed');
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets', 'vendor', 'three.module.min.js')), 'three.js no longer vendored');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'CREDITS.md')), 'asset credits recorded');

  const poster = path.join(ROOT, 'assets', 'vibe-coding-dari-nol-poster.png');
  assert.ok(fs.existsSync(poster), 'poster file exists');

  assert.strictEqual(emailFromBody('{"email":"a@b.co"}', 'application/json'), 'a@b.co', 'json email parses');
  assert.strictEqual(emailFromBody('email=a%40b.co', 'application/x-www-form-urlencoded'), 'a@b.co', 'form email parses');
  assert.strictEqual(emailFromBody('email=+%40', 'application/x-www-form-urlencoded'), '@', 'form email decodes plus signs');
  assert.throws(() => emailFromBody('email=a%40b.co', 'application/json'), 'form body is not valid JSON');

  console.log('selftest ok');
}

if (require.main === module) {
  if (process.argv.includes('--selftest')) {
    selftest();
    process.exit(0);
  }
  createServer().listen(PORT, HOST, () => {
    console.log(`kolibri.alignment.id listening on http://${HOST}:${PORT}`);
    if (!WEBHOOK_URL) console.warn('DISCORD_WEBHOOK_URL not set — /api/waitlist will 503');
  });
}

module.exports = { createServer, isRateLimited, emailFromBody, EMAIL_RE };
