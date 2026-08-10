#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;

// Cloudflare caches /styles.css and /app.js in front of this origin, so a deploy
// alone does not reach visitors. Version the URLs by content instead.
const hash = (...files) => crypto
  .createHash('md5')
  .update(files.map((f) => fs.readFileSync(path.join(ROOT, f))).reduce((a, b) => Buffer.concat([a, b])))
  .digest('hex')
  .slice(0, 10);

const cssVersion = hash('styles.css');
// app.js hands its own ?v= to the hummingbird datasets, so they have to be part
// of this hash: new frames must produce a new URL for the script and the data.
const jsVersion = hash(
  'app.js',
  'page-content.js',
  'assets/hummingbird-feeding_data.js',
  'assets/hummingbird-hover_data.js'
);
// Each bird ships its animation's own first frame, so the page reads the same
// before hydration and without JavaScript as it does once the frames arrive.
const bird = fs.readFileSync(path.join(ROOT, 'assets/hummingbird-feeding-frame0.txt'), 'utf8');
// Closing bloom (flower) — dataset file still named hummingbird-hover from import.
const bloomFrame0 = fs.readFileSync(path.join(ROOT, 'assets/hummingbird-hover-frame0.txt'), 'utf8');
const wave = fs.readFileSync(path.join(ROOT, 'assets/kolibri-closing-art.txt'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// One footer for every alignment.id site: link data lives in the shared
// footer-links.json that the React marketing footer also renders from.
const footerLinks = JSON.parse(
  fs.readFileSync(path.join(ROOT, '..', 'src', 'app', 'components', 'footer-links.json'), 'utf8')
);
const footerProductLinks = footerLinks.products
  .map((p) => `            <a href="${p.href}" class="site-footer__column-link" target="_blank" rel="noreferrer">${p.label}</a>`)
  .join('\n');
const footerPolicyLinks = footerLinks.policies
  .map((p) => `            <a href="${p.href}" class="site-footer__column-link">${p.label}</a>`)
  .join('\n');
const footerSocialLinks = footerLinks.socials
  .map((s) => `          <a href="${s.href}" target="_blank" rel="noreferrer" class="site-footer__social-link"><img src="${s.logo}" alt="" width="18" height="18" class="site-footer__social-icon" /><span class="sr-only">${s.label}</span></a>`)
  .join('\n');

// In-person vibe-coding sessions, one slide each. Dims are the real source
// sizes so the browser can reserve the stage before the file arrives.
const teachingSessions = [
  ['teaching-2026-06-06.jpg', 'Teaching session — Jun 6, 2026', 1836, 3264, 'teaching-slide--people'],
  ['teaching-2026-06-07-1.jpg', 'Teaching session — Jun 7, 2026', 1600, 715],
  ['teaching-2026-06-07-2.jpg', 'Teaching session — Jun 7, 2026', 1600, 715],
  ['teaching-2026-06-17-1.jpg', 'Teaching session — Jun 17, 2026', 1280, 720],
  ['teaching-2026-06-17-2.jpg', 'Teaching session — Jun 17, 2026', 1280, 720],
  ['teaching-2026-07-05-1.jpg', 'Teaching session — Jul 5, 2026', 1080, 2412],
  ['teaching-2026-07-05-2.jpg', 'Teaching session — Jul 5, 2026', 3024, 4032],
  ['teaching-2026-07-16.jpg', 'Teaching session — Jul 16, 2026', 3264, 2448],
  ['teaching-2026-07-20.webp', 'Teaching session — Jul 20, 2026', 1280, 960],
];

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kolibri | Learn programming by solving problems</title>
  <meta name="description" content="Kolibri is an interactive programming course being developed around concepts, independent problem solving, and projects chosen by the learner." />
  <meta property="og:title" content="Kolibri | Learn programming by solving problems" />
  <meta property="og:description" content="Kolibri is an interactive programming course being developed around concepts, independent problem solving, and projects chosen by the learner." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://kolibri.alignment.id" />
  <meta name="twitter:card" content="summary" />
  <link rel="icon" type="image/svg+xml" href="/assets/alignmentlogo.svg" />
  <link rel="canonical" href="https://kolibri.alignment.id/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css?v=${cssVersion}" />
  <!-- Ships with the markup so a stale cached stylesheet can never let the
       painting escape its section and cover the hero. -->
  <style>#lessons{position:relative;overflow:hidden}.lesson-painting{position:absolute;inset:0;z-index:0}#lessons>h2,.ide{position:relative;z-index:1}</style>
</head>
<body>
  <header class="nav-shell">
    <nav class="nav-bar" aria-label="Primary">
      <a href="https://alignment.id" class="nav-logo"><span class="sr-only">Alignment</span><img src="/assets/alignmentlogo.svg" alt="Alignment" width="120" height="32" /></a>
      <div class="nav-primary">
        <div class="nav-links">
          <a href="https://kolibri.alignment.id" class="nav-link">KOLIBRI</a>
          <a href="https://alignment.id/hire" class="nav-link">HIRE</a>
          <a href="https://vstal.in" class="nav-link">VSTAL.IN</a>
        </div>
        <a href="https://gray.alignment.id" class="nav-cta" target="_blank" rel="noreferrer">
          <span class="sr-only">Open Gray workspace</span><img src="/assets/grayaiwhitenotspinning.svg" alt="" width="20" height="20" class="nav-cta__icon" aria-hidden="true" />
        </a>
      </div>
      <button type="button" class="nav-menu-btn" id="nav-menu-btn" aria-expanded="false" aria-controls="nav-menu-panel">Menu</button>
    </nav>
    <div class="nav-menu-panel" id="nav-menu-panel" hidden>
      <a href="https://kolibri.alignment.id" class="nav-link">KOLIBRI</a>
      <a href="https://alignment.id/hire" class="nav-link">HIRE</a>
      <a href="https://vstal.in" class="nav-link">VSTAL.IN</a>
      <a href="https://gray.alignment.id" class="nav-cta nav-cta--panel" target="_blank" rel="noreferrer">
        <span class="sr-only">Open Gray workspace</span><img src="/assets/grayaiwhitenotspinning.svg" alt="" width="20" height="20" class="nav-cta__icon" aria-hidden="true" />
      </a>
    </div>
  </header>

  <main>
    <section class="hero" aria-labelledby="hero-title" data-reveal="fade">
      <div class="hero-grid">
        <div class="bird-column" data-reveal="left">
          <div class="bird-wrap" id="bird-wrap">
            <pre class="bird" id="bird" aria-hidden="true" data-ascii-fit data-ascii-max="11">${esc(bird)}</pre>
          </div>
        </div>
        <div class="hero-text" data-reveal style="--reveal-delay:140ms">
          <h1 class="tagline" id="hero-title">Learn programming by solving a problem you already have.</h1>
          <p class="bio">Kolibri is an interactive course about the ideas underneath programming and what those ideas let you do. You will work with examples, change working systems, investigate mistakes, and then look for somewhere the same idea could be useful in your own life. The point is not to remember the example. It is to understand it well enough to use the concept somewhere the course did not choose for you.</p>
        </div>
      </div>
    </section>

    <section class="section moire-section" id="how" aria-labelledby="concepts-title" data-reveal="fade">
      <div class="moire-visual" id="moire-visual" aria-hidden="true">
        <canvas class="moire-canvas" id="moire-canvas"></canvas>
      </div>
      <div class="moire-copy" data-reveal>
        <p class="moire-eyebrow">How Kolibri teaches</p>
        <h2 id="concepts-title" class="moire-title">AI can write the code.<br />You still have to make the decisions.</h2>
        <div class="moire-body">
          <p>You begin with something small that already runs: a reminder that fires too late, a form that accepts the wrong thing, or a tool that almost solves a problem you actually have.</p>
          <p>Ask AI to change it. Watch what happens. Trace the mistake far enough to understand it. Keep what works, reject what does not, and decide what the system should do next.</p>
          <p>Later, the same idea returns somewhere else&mdash;under another name, inside another problem. Kolibri does not test whether you remember the syntax. It tests whether you can recognize what is needed, direct the work, and notice when the answer is not good enough.</p>
          <p class="moire-closing">The prompt disappears. The problem remains yours.</p>
        </div>
      </div>
    </section>

    <section class="section section-wide" id="lessons" aria-labelledby="lesson-title" data-reveal="fade">
      <!-- Claude Monet, Impression, Sunrise (1872).
           Wikimedia Commons source: https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg
           Public domain (PD-old-95-1996, CC-PD-Mark, attribution not required);
           local 1400px derivative, decorative use behind the lesson panel.
           Lives directly inside the section so it can never paint over the next one. -->
      <div class="lesson-painting" aria-hidden="true">
        <img src="/assets/monet-impression-sunrise.webp" alt="" width="1400" height="1086" loading="lazy" decoding="async" />
      </div>
      <h2 id="lesson-title" data-reveal>Lessons give you less help as you go.</h2>
      <div class="lesson-intro" data-reveal style="--reveal-delay:60ms">
        <p>Kolibri starts with a short explanation beside a program you can run. There are no videos to sit through. You read the idea, change the code, and see what happens.</p>
        <p>Each lesson introduces a programming concept inside something concrete: a condition that classifies an expense, state that changes after an action, or a function used in several places. The AI assistant can explain a line, suggest an approach, or generate a draft. Every change still appears inside the editor, where you can inspect it, edit it, and run it yourself.</p>
        <p>Later lessons give you less instruction. Sometimes you add a feature. Sometimes you are shown a broken result and have to find the cause. At the end, Kolibri gives you a project with a clear scope, not a finished recipe. You decide how to build it, use AI when it helps, and remain responsible for the code you submit.</p>
      </div>
      <div class="ide" data-reveal style="--reveal-delay:120ms">
        <div class="ide-topbar" role="tablist" aria-label="Course stages">
          <button type="button" class="ide-tab is-active" data-stage-tab="learn" aria-pressed="true"><span>01</span> Learn</button>
          <button type="button" class="ide-tab" data-stage-tab="debug" aria-pressed="false"><span>02</span> Build &amp; Debug</button>
          <button type="button" class="ide-tab" data-stage-tab="project" aria-pressed="false"><span>03</span> Final Project</button>
        </div>
        <div class="ide-body" data-mobile-view="code">
          <div class="ide-mobile-tabs" aria-label="Workspace views">
            <button type="button" class="ide-tab is-active" data-mobile-tab="code">Code</button>
            <button type="button" class="ide-tab" data-mobile-tab="output">Output</button>
            <button type="button" class="ide-tab" data-mobile-tab="chat">AI</button>
          </div>
          <aside class="ide-rail" aria-label="Lesson rail">
            <div class="rail-pane" data-rail="learn">
              <p class="rail-heading">Lesson</p>
              <ol class="rail-list">
                <li><span class="rail-dot" aria-hidden="true"></span>Concept</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Change code</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Run check</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Explain result</li>
              </ol>
              <p class="rail-heading">Files</p>
              <ul class="file-tree">
                <li class="file-folder">src
                  <ul>
                    <li class="file-file is-open">expenses.js</li>
                    <li class="file-file">app.js</li>
                    <li class="file-file">styles.css</li>
                  </ul>
                </li>
              </ul>
            </div>
            <div class="rail-pane" data-rail="debug" hidden>
              <p class="rail-heading">Project</p>
              <ol class="rail-list">
                <li><span class="rail-dot" aria-hidden="true"></span>Reproduce bug</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Find cause</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Make change</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Run tests</li>
              </ol>
              <p class="rail-heading">Files</p>
              <ul class="file-tree">
                <li class="file-folder">src
                  <ul>
                    <li class="file-file is-open">reminders.js</li>
                    <li class="file-file">scheduler.js</li>
                    <li class="file-file">dates.js</li>
                  </ul>
                </li>
                <li class="file-folder">tests
                  <ul>
                    <li class="file-file">reminders.test.js</li>
                  </ul>
                </li>
              </ul>
            </div>
            <div class="rail-pane" data-rail="project" hidden>
              <p class="rail-heading">Project scope</p>
              <p class="rail-sub">Requirements</p>
              <ol class="rail-list">
                <li class="is-done"><span class="rail-dot" aria-hidden="true"></span>Core input</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Main behavior</li>
                <li><span class="rail-dot" aria-hidden="true"></span>Useful output</li>
              </ol>
              <p class="rail-sub">Not required</p>
              <ul class="scope-list">
                <li>extra feature</li>
                <li>automation</li>
                <li>integration</li>
              </ul>
              <p class="rail-heading">Files</p>
              <ul class="file-tree">
                <li class="file-file">README.md</li>
                <li class="file-file is-open">app.js</li>
              </ul>
              <p class="rail-progress">Progress <strong data-progress>1/4</strong> complete</p>
            </div>
          </aside>

          <div class="ide-workspace">
            <div class="workspace-tabs" aria-label="Open files">
              <span class="js-badge" aria-hidden="true"><img src="/assets/javascript.svg" alt="" width="18" height="18" /></span>
              <div class="workspace-file-tabs" data-file-tabs>
                <span class="workspace-tab is-active">expenses.js</span>
              </div>
            </div>
            <pre class="code-render" id="demo-code" aria-label="Project code"></pre>
            <div class="output-panel" id="demo-output"></div>
            <div class="diff-actions" id="demo-diff-actions" hidden>
              <span class="diff-action">Apply change</span>
              <span class="diff-action">Edit manually</span>
              <span class="diff-action diff-action--reject">Reject</span>
            </div>
          </div>

          <div class="ide-chat">
            <div class="chat-log" id="demo-chat" aria-live="polite">
              <div class="chat-msg chat-msg--ai">
                <p>Kolibri starts with a short explanation beside a program you can run. There are no videos to sit through. You read the idea, change the code, and see what happens.</p>
                <p>Each lesson introduces a programming concept inside something concrete: a condition that classifies an expense, state that changes after an action, or a function used in several places. The AI assistant can explain a line, suggest an approach, or generate a draft. Every change still appears inside the editor, where you can inspect it, edit it, and run it yourself.</p>
                <p>Later lessons give you less instruction. Sometimes you add a feature. Sometimes you are shown a broken result and have to find the cause. At the end, Kolibri gives you a project with a clear scope, not a finished recipe. You decide how to build it, use AI when it helps, and remain responsible for the code you submit.</p>
              </div>
            </div>
            <div class="chat-prompts" id="demo-prompts"></div>
            <div class="chat-input-row">
              <div class="attach-chip" id="demo-attach" hidden></div>
              <input class="chat-input" id="demo-input" type="text" placeholder="What bothers you? Type it here&hellip;" aria-label="Describe a problem from your own life for the final project" autocomplete="off" disabled />
              <button type="button" class="chat-send" id="demo-send" disabled>Send &rarr;</button>
            </div>
          </div>
        </div>
        <div class="ide-statusbar" id="demo-status">STATUS: expenses.js selected &middot; check not run</div>
      </div>
    </section>

    <section class="section" id="current-state" aria-labelledby="state-title" data-reveal="fade">
      <div class="state-grid">
        <div data-reveal>
          <h2 id="state-title">What exists now</h2>
          <p>Alignment is currently run by one person.</p>
          <p>Gray shipped and reached real use before being parked. Small programming sessions have been running in person. Kolibri now has a public site, a curriculum direction, and several interface experiments. The course itself still has to be built.</p>
          <p>There are also deployments, internal tools, teaching materials, abandoned approaches, and smaller technical projects. Some are polished. Others are useful mainly because they show what happened.</p>
          <div class="state-links">
            <a class="portfolio-link" href="https://vstal.in/portfolio">See previous work</a>
            <a class="portfolio-link" href="https://alignment.id">Alignment</a>
          </div>
        </div>
        <div class="teaching-gallery" data-carousel data-reveal="right" style="--reveal-delay:160ms" aria-label="Recent teaching sessions">
          <div class="teaching-stage">
            <ul class="teaching-track" data-carousel-track>
              ${teachingSessions.map(([file, caption, width, height, modifier = ''], i) => [
                `<li class="teaching-slide${modifier ? ` ${modifier}` : ''}">`,
                `  <img src="/assets/${file}" alt="${caption}" width="${width}" height="${height}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" />`,
                `  <p class="teaching-caption">${caption}</p>`,
                '</li>',
              ].join('\n')).join('\n')}
            </ul>
            <button type="button" class="carousel-arrow carousel-arrow--prev" data-carousel-prev aria-label="Previous teaching session">&lsaquo;</button>
            <button type="button" class="carousel-arrow carousel-arrow--next" data-carousel-next aria-label="Next teaching session">&rsaquo;</button>
          </div>
          <ol class="carousel-dots" data-carousel-dots aria-label="Teaching session slides"></ol>
        </div>
      </div>
    </section>

    <section class="section section-bloom" id="final" aria-labelledby="final-title" data-reveal="fade">
      <div class="bloom-grid">
        <div class="bloom-wrap" data-reveal="left">
          <pre class="bloom-art" id="bloom" aria-hidden="true" data-ascii-fit data-ascii-max="11">${esc(bloomFrame0)}</pre>
        </div>
        <div class="bloom-copy" data-reveal="right" style="--reveal-delay:140ms">
          <h2 id="final-title">The course should make itself less necessary</h2>
          <p>Kolibri will have succeeded when a learner can encounter a problem, decide whether code could help, and make a reasonable first attempt without waiting for a course to describe every step. They may still need documentation, other people, or AI. The difference is that those tools support their judgment instead of replacing it.</p>
        </div>
      </div>
    </section>

    <section class="section waitlist-section" id="waitlist" aria-labelledby="waitlist-title" data-reveal="fade">
      <div class="waitlist-main" data-reveal>
        <h2 id="waitlist-title">Follow the online course build</h2>
        <p class="waitlist-copy">Kolibri is still being developed. Join the existing update list to hear when the browser-based course is ready to try. We will only use this address for Kolibri product updates.</p>
        <form class="waitlist" id="waitlist-form" action="/api/waitlist" method="post" novalidate>
          <label for="waitlist-email">Email address</label>
          <div class="waitlist-row">
            <input id="waitlist-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required maxlength="254" />
            <button type="submit">Join early access</button>
          </div>
        </form>
        <p class="privacy">We will only email you about Kolibri product updates.</p>
        <p class="form-status" id="form-status" role="status" aria-live="polite"></p>
      </div>
      <div class="waitlist-wave" aria-hidden="true">
        <pre class="waitlist-wave-art">${esc(wave)}</pre>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer__media no-save" aria-hidden="true">
      <img src="/astronaut.jpg" alt="" class="site-footer__image" loading="lazy" decoding="async" draggable="false" />
    </div>
    <div class="site-footer__overlay">
      <div class="site-footer__grid">
        <div class="site-footer__column">
          <p class="site-footer__column-title">Products</p>
${footerProductLinks}
        </div>
        <div class="site-footer__column">
          <p class="site-footer__column-title">Research</p>
          <span class="site-footer__column-note">${footerLinks.researchNote}</span>
        </div>
        <div class="site-footer__column">
          <p class="site-footer__column-title">Contact</p>
          <a href="${footerLinks.contact.href}" class="site-footer__column-link">${footerLinks.contact.label}</a>
        </div>
      </div>
      <div class="site-footer__grid site-footer__grid--secondary">
        <div class="site-footer__column site-footer__column-stack">
          <p class="site-footer__column-title">Policies</p>
${footerPolicyLinks}
        </div>
        <div class="site-footer__column">
          <p class="site-footer__column-title">Blog</p>
          <span class="site-footer__column-note">${footerLinks.blogNote}</span>
        </div>
      </div>
      <div class="site-footer__social-row">
        <div class="site-footer__social-links">
${footerSocialLinks}
        </div>
        <p class="site-footer__meta">© 2026 Alignment. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <noscript>
    <p class="noscript-note">JavaScript is required for the lesson demonstration. The rest of this page remains readable without it.</p>
  </noscript>
  <script type="module" src="/app.js?v=${jsVersion}"></script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('built index.html');
