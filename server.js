// kolibri.alignment.id — early-access page + waitlist webhook relay.
// Zero-dependency Node server, same pattern as vstal.in/server/form-server.js.
//
//   GET  /*              -> static files from this directory
//   POST /api/waitlist   -> {email} -> Discord webhook
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
    if (ext === '.js' && filePath.includes(`${path.sep}assets${path.sep}`)) {
      headers['cache-control'] = 'public, max-age=3600';
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

async function handleWaitlist(req, res) {
  let email;
  try {
    const raw = await readBody(req);
    const parsed = JSON.parse(raw);
    email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
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
  assert.ok(indexHtml.includes('Programming concepts are tools'), 'concepts section present');
  assert.ok(indexHtml.includes('The example is only the beginning'), 'lesson section present');
  assert.ok(indexHtml.includes('Eventually, nobody tells you which concept applies'), 'independence section present');
  assert.ok(indexHtml.includes('Help without taking over'), 'help section present');
  assert.ok(indexHtml.includes('SHARED EXPENSE CHECKER'), 'project concept present');
  assert.ok(indexHtml.includes('What exists now'), 'current state section present');
  assert.strictEqual((indexHtml.match(/<form class="waitlist"/g) || []).length, 1, 'one waitlist form present');
  assert.ok(indexHtml.includes('Follow the online course build'), 'waitlist heading present');
  assert.ok(indexHtml.includes('waitlist-wave-art'), 'wave beside waitlist');
  assert.ok(indexHtml.includes('aria-hidden="true"'), 'decorative art is hidden from assistive technology');
  assert.ok(indexHtml.includes('van-gogh-starry-night-rhone.webp'), 'Van Gogh painting referenced');
  assert.ok(indexHtml.includes('monet-water-lilies.webp'), 'Monet painting referenced');
  assert.ok(indexHtml.includes('monet-impression-sunrise.webp'), 'Monet behind lesson panel referenced');
  assert.ok(indexHtml.includes('<canvas id="armature-canvas" aria-hidden="true">'), 'armature canvas present and decorative');
  assert.ok(indexHtml.includes('vibe-coding-dari-nol-poster.png'), 'poster asset referenced');
  assert.ok(indexHtml.includes('vstal.in/portfolio'), 'portfolio link present');
  assert.ok(!indexHtml.includes('Small cohorts near UI'), 'in-person-first positioning removed');
  assert.ok(!indexHtml.includes('class="closing-art"'), 'standalone closing art removed');

  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const styles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.ok(appJs.includes('setInterval(tick, FRAME_MS)'), 'hummingbird animation loop present');
  assert.ok(appJs.includes("localStorage.setItem(MOTION_KEY"), 'motion opt-in is remembered');
  assert.ok(appJs.includes('systemReducesMotion'), 'system reduced-motion preference still honoured by default');
  assert.ok(appJs.includes('fitAsciiArt'), 'ascii art is measured and fitted to its column');
  assert.ok(indexHtml.includes('id="motion-toggle"'), 'motion control present beside the hummingbird');
  assert.ok(!/overflow-x:\s*(auto|scroll)/.test(styles), 'no horizontal scrollbars in stylesheet');
  assert.ok(!styles.includes('waitlist-wave-scroll'), 'wave scroll wrapper removed');
  assert.ok(/#lessons\s*\{[^}]*overflow:\s*hidden/.test(styles), 'lesson section clips its painting');
  assert.ok(appJs.includes('STORAGE_KEY'), 'expense lesson persistence wiring present');
  const pageContent = fs.readFileSync(path.join(ROOT, 'page-content.js'), 'utf8');
  assert.ok(pageContent.includes('kolibri-expense-demo-v1'), 'expense lesson storage key present');
  const wave = fs.readFileSync(path.join(ROOT, 'assets', 'kolibri-closing-art.txt'), 'utf8');
  const bird = fs.readFileSync(path.join(ROOT, 'assets', 'kolibri-hummingbird.txt'), 'utf8');
  assert.ok(indexHtml.includes(wave), 'closing art preserved byte-for-byte');
  assert.ok(indexHtml.includes(bird), 'static hummingbird preserved byte-for-byte');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'van-gogh-starry-night-rhone.webp')), 'Van Gogh asset exists');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'monet-water-lilies.webp')), 'Monet asset exists');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'monet-impression-sunrise.webp')), 'lesson-panel Monet asset exists');

  // WebGL is an enhancement: three.js must stay lazy, decorative and local.
  const sceneJs = fs.readFileSync(path.join(ROOT, 'scene.js'), 'utf8');
  assert.ok(appJs.includes("import('./scene.js')"), 'three.js scene is dynamically imported');
  assert.ok(appJs.includes("getContext('webgl2')"), 'WebGL is feature-detected before loading three.js');
  assert.ok(sceneJs.includes('reduceMotion'), 'scene respects reduced motion');
  assert.ok(sceneJs.includes('setPixelRatio'), 'scene caps device pixel ratio');
  assert.ok(sceneJs.includes('visibilitychange') && sceneJs.includes('IntersectionObserver'), 'scene pauses off-screen and when hidden');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'vendor', 'three.module.min.js')), 'three.js is vendored locally');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'vendor', 'three-LICENSE.txt')), 'three.js MIT licence shipped with the copy');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets', 'CREDITS.md')), 'asset credits recorded');
  assert.ok(!sceneJs.includes('examples/jsm'), 'no three.js examples modules pulled in');

  const poster = path.join(ROOT, 'assets', 'vibe-coding-dari-nol-poster.png');
  assert.ok(fs.existsSync(poster), 'poster file exists');

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

module.exports = { createServer, isRateLimited, EMAIL_RE };
