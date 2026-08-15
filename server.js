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

import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';
import assert from 'assert';

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  ? path.join(__dirname, 'dist')
  : __dirname;
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
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

  assert.strictEqual(emailFromBody('{"email":"a@b.co"}', 'application/json'), 'a@b.co', 'json email parses');
  assert.strictEqual(emailFromBody('email=a%40b.co', 'application/x-www-form-urlencoded'), 'a@b.co', 'form email parses');
  assert.strictEqual(emailFromBody('email=+%40', 'application/x-www-form-urlencoded'), '@', 'form email decodes plus signs');
  assert.throws(() => emailFromBody('email=a%40b.co', 'application/json'), 'form body is not valid JSON');

  const isDist = ROOT !== __dirname;
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('<div id="root">'), 'Vite entry mounts #root');
  assert.ok(/<title>[^<]+<\/title>/.test(indexHtml), 'page has a title');

  if (isDist) {
    // Production build: the copy lives in the hashed bundle, not the html.
    const match = indexHtml.match(/assets\/index-[^"]+\.js/);
    assert.ok(match, 'dist html references the hashed app bundle');
    const bundle = fs.readFileSync(path.join(ROOT, match[0]), 'utf8');
    assert.ok(bundle.includes('Learn programming by solving a problem you already have.'), 'hero headline survives the build');
    assert.ok(bundle.includes('AI can write the code.'), 'concepts section survives the build');
    assert.ok(bundle.includes('/api/waitlist'), 'page posts to waitlist');
    assert.ok(bundle.includes('Follow the online course build'), 'waitlist section survives the build');
    assert.ok(bundle.includes('kolibri.progress.v1') || bundle.includes('kolibri\\.progress'), 'course progress key in the bundle');
  } else {
    // Source checkout: dev-mode entry only needs the mount point.
    assert.ok(indexHtml.includes('/src/main.jsx'), 'dev entry loads the React app');
  }

  console.log(`selftest ok (root: ${ROOT})`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--selftest')) {
    selftest();
    process.exit(0);
  }
  createServer().listen(PORT, HOST, () => {
    console.log(`kolibri.alignment.id listening on http://${HOST}:${PORT}`);
    if (!WEBHOOK_URL) console.warn('DISCORD_WEBHOOK_URL not set — /api/waitlist will 503');
  });
}

export { createServer, isRateLimited, emailFromBody, EMAIL_RE };
