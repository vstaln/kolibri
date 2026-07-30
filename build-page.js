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
const jsVersion = hash('app.js', 'scene.js', 'page-content.js');
const bird = fs.readFileSync(path.join(ROOT, 'assets/kolibri-hummingbird.txt'), 'utf8');
const wave = fs.readFileSync(path.join(ROOT, 'assets/kolibri-closing-art.txt'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

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
</head>
<body>
  <header class="nav-shell">
    <nav class="nav-bar" aria-label="Primary">
      <a href="https://alignment.id" class="nav-logo"><span class="sr-only">Alignment</span><img src="/assets/alignmentlogo.svg" alt="Alignment" width="120" height="32" /></a>
      <div class="nav-primary">
        <div class="nav-links" id="nav-links-desktop">
          <a href="#how" class="nav-link" data-nav>How it works</a>
          <a href="#lessons" class="nav-link" data-nav>Lessons</a>
          <a href="#projects" class="nav-link" data-nav>Projects</a>
          <a href="#current-state" class="nav-link" data-nav>Current state</a>
        </div>
        <a href="#how" class="nav-action">How Kolibri works</a>
        <button type="button" class="nav-menu-btn" id="nav-menu-btn" aria-expanded="false" aria-controls="nav-menu-panel">Menu</button>
      </div>
    </nav>
    <div class="nav-menu-panel" id="nav-menu-panel" hidden>
      <a href="#how" class="nav-link" data-nav>How it works</a>
      <a href="#lessons" class="nav-link" data-nav>Lessons</a>
      <a href="#projects" class="nav-link" data-nav>Projects</a>
      <a href="#current-state" class="nav-link" data-nav>Current state</a>
      <a href="#how" class="nav-action">How Kolibri works</a>
    </div>
  </header>

  <main>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-grid">
        <div class="bird-column">
          <div class="bird-wrap" id="bird-wrap">
            <pre class="bird" id="bird" aria-hidden="true" data-ascii-fit data-ascii-max="11">${esc(bird)}</pre>
          </div>
          <button type="button" class="motion-toggle" id="motion-toggle" aria-pressed="false" aria-label="Hummingbird motion">Motion</button>
        </div>
        <div class="hero-text">
          <p class="eyebrow">KOLIBRI</p>
          <h1 class="tagline" id="hero-title">Learn programming by solving a problem you already have.</h1>
          <p class="bio">Kolibri is an interactive course about the ideas underneath programming and what those ideas let you do. You will work with examples, change working systems, investigate mistakes, and then look for somewhere the same idea could be useful in your own life. The point is not to remember the example. It is to understand it well enough to use the concept somewhere the course did not choose for you.</p>
          <a class="text-link" href="#how">See how it works</a>
        </div>
      </div>
    </section>

    <section class="section" id="how" aria-labelledby="concepts-title">
      <div class="section-grid concepts-grid">
        <div class="section-copy">
          <h2 id="concepts-title">Programming concepts are tools</h2>
          <p>A concept is easier to understand when it has a job to do. Variables become useful when something needs to be remembered. Conditions matter when a program has to make a decision. Functions help when the same kind of work appears in several places. Data structures matter when information needs to remain organized as it changes. An API becomes relevant when a program needs something outside itself.</p>
          <p>Kolibri introduces these ideas inside small working systems. You inspect what the system is doing, change part of it, and see what your decision affected. The lesson then asks you to find a different situation where the same idea might help. Sometimes that becomes code. Sometimes the first useful step is describing the problem more clearly.</p>
        </div>
        <div class="concept-map" id="concept-map" aria-label="Concept reuse demonstration">
          <div class="concept-map-core">
            <p class="panel-kicker">Decision</p>
            <div class="decision-block">if condition<br>then action</div>
            <p class="decision-io"><span data-decision-input></span> → <span data-decision-action></span></p>
          </div>
          <div class="concept-map-situations">
            <button type="button" class="situation-btn" data-situation data-input="expense category" data-action="essential or optional">An expense is essential or optional</button>
            <button type="button" class="situation-btn" data-situation data-input="due date" data-action="send reminder">A reminder is due or not due</button>
            <button type="button" class="situation-btn" data-situation data-input="form fields" data-action="allow submit">A form is complete or incomplete</button>
            <button type="button" class="situation-btn" data-situation data-input="file type" data-action="choose folder">A file belongs in one folder or another</button>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-wide" id="lessons" aria-labelledby="lesson-title">
      <!-- Claude Monet, Impression, Sunrise (1872).
           Wikimedia Commons source: https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg
           Public domain (PD-old-95-1996, CC-PD-Mark, attribution not required);
           local 1400px derivative, decorative use behind the lesson panel.
           Lives directly inside the section so it can never paint over the next one. -->
      <div class="lesson-painting" aria-hidden="true">
        <img src="/assets/monet-impression-sunrise.webp" alt="" width="1400" height="1086" loading="lazy" decoding="async" />
      </div>
      <h2 id="lesson-title">The example is only the beginning</h2>
      <div class="lesson-stage">
        <div class="lesson-shell">
        <article class="lesson-panel">
          <p class="panel-kicker">Concept</p>
          <p>A condition represents a decision. This small expense tool should treat food, transport, and housing differently from optional spending.</p>
          <div class="task-box"><strong>YOUR TASK</strong><p id="expense-task"></p></div>
          <div class="lesson-tools">
            <button type="button" class="concept-button" id="expense-hint">Reveal a hint</button>
            <button type="button" class="concept-button" id="expense-reset">Reset task</button>
          </div>
          <p class="hint-text" id="expense-hint-text" aria-live="polite"></p>
        </article>
        <div class="lesson-workspace">
          <div class="workspace-tabs" role="tablist" aria-label="Lesson workspace">
            <span class="workspace-tab" role="tab" aria-selected="true">expenses.js</span>
            <span class="workspace-tab" role="tab" aria-selected="false">Preview</span>
          </div>
          <label for="expense-code" class="sr-only">Expense rule code</label>
          <textarea class="code-editor" id="expense-code" spellcheck="false"></textarea>
          <div class="output-panel">
            <strong>Expense data</strong>
            <pre class="expense-data" id="expense-preview">Run the check to preview how each expense is classified.</pre>
            <div class="lesson-tools"><button type="button" class="concept-button primary" id="expense-run">Run check</button></div>
            <p class="check-result" id="expense-result" role="status">Not checked yet. Change the rule, then run the check.</p>
            <div id="expense-reflection" hidden>
              <p class="reflection-q"></p>
              <p class="reflection-follow"></p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>

    <section class="section section-narrow" id="application" aria-labelledby="application-title">
      <h2 id="application-title">A lesson should leave the lesson</h2>
      <p>Completing the provided example is not enough. After a concept has been introduced in a controlled setting, Kolibri asks the learner to look for another place where it could matter. A repeated decision, an annoying manual task, information that keeps getting lost, or a process that depends on copying the same things between several places may all be useful starting points.</p>
      <p>The first response does not always need to be a complete application. It may be a description of the inputs and outputs, a rough flow, a small script, or one working part of a larger idea. Kolibri should help the learner make the next practical step rather than encouraging every observation to become an oversized product.</p>
      <p>The course can provide examples, constraints, and questions, but it should not make the final connection on the learner's behalf.</p>
      <div class="tool-examples" aria-label="Modest personal tools">
        <div class="tool-example">File organizer</div>
        <div class="tool-example">Spending rule</div>
        <div class="tool-example">Reading-list tool</div>
        <div class="tool-example">Study reminder</div>
        <div class="tool-example">Student organization form</div>
      </div>
    </section>

    <section class="section section-dark" id="independent" aria-labelledby="independent-title">
      <h2 id="independent-title">Eventually, nobody tells you which concept applies</h2>
      <p>Early lessons can identify the relevant file, concept, and expected result. Later work should provide less of that structure. A learner may receive a system that behaves incorrectly without being told where the problem is. Another task may have several reasonable solutions. A project may begin with a situation rather than a technical instruction.</p>
      <p>Outside a course, problems rarely arrive with a task description that names the correct concept. Part of learning to program is learning how to create that structure yourself. You need to decide what the problem is, what information matters, what can be ignored for now, and what a useful first version would prove.</p>
      <p>Kolibri should become less helpful as the learner becomes more capable. It should not disappear completely, but the responsibility for making decisions should gradually move from the course to the learner.</p>
      <figure class="armature-plate" id="armature-plate">
        <div class="armature-viewport">
          <canvas id="armature-canvas" aria-hidden="true"></canvas>
        </div>
        <div class="armature-scale" aria-hidden="true"><span>guided</span><span>partial</span><span>open</span></div>
        <figcaption>Diagram: the support structure is withdrawn as you scroll, and the instrument keeps turning without it.</figcaption>
      </figure>
      <div class="guidance-composition">
        <!-- Vincent van Gogh, Starry Night Over the Rhône (1888).
             Wikimedia Commons source: https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg
             Public Domain Mark 1.0; local 1280px derivative, decorative use. -->
        <div class="painting-atmosphere painting-starry" aria-hidden="true">
          <img src="/assets/van-gogh-starry-night-rhone.webp" alt="" width="1280" height="989" loading="lazy" decoding="async" />
        </div>
        <div class="guidance-stages" id="guidance-stages" aria-label="How lesson guidance is gradually removed">
          <article class="guidance-panel guidance-panel-guided">
            <h3>Guided</h3>
            <ul><li>Relevant file highlighted</li><li>Detailed task</li><li>Visible expected output</li><li>Clear automated check</li></ul>
          </article>
          <article class="guidance-panel guidance-panel-partial">
            <h3>Partial</h3>
            <ul><li>Description of incorrect behavior</li><li>Several files without naming which one matters</li><li>Test result</li><li>Optional hints</li></ul>
          </article>
          <article class="guidance-panel guidance-panel-open">
            <h3>Open</h3>
            <ul><li>Short account of a person's problem</li><li>Imperfect existing system</li><li>No named programming concept</li><li>No prescribed implementation</li></ul>
          </article>
        </div>
      </div>
    </section>

    <section class="section section-quiet" id="help" aria-labelledby="help-title">
      <h2 id="help-title">Help without taking over</h2>
      <p>When something fails, Kolibri should help the learner investigate before revealing a finished answer. It may explain which requirement was not met, ask what the learner expected to happen, or direct attention toward a relevant part of the system. Later hints can become more specific when the learner remains stuck.</p>
      <p>An AI assistant can use the current lesson, code, attempts, and error output as context. It can explain an unfamiliar message, question an assumption, compare two approaches, or create a smaller example. It should not respond to every difficulty by rewriting the project.</p>
      <p>Some lessons should place AI-generated code in front of the learner and ask whether it is correct, appropriate, or needlessly complicated. The learner still has to decide whether the output belongs in the system.</p>
      <div class="help-dialogue" aria-label="Assistant interaction example">
        <div class="help-turn"><strong>Learner</strong><p>The test still fails, but the output looks right to me.</p></div>
        <div class="help-turn"><strong>Kolibri</strong><p>Which expense categories does your rule currently treat as essential? Compare that list with the requirement before changing the code again.</p></div>
        <div class="help-turn"><strong>Learner</strong><p>I included food and housing, but not transport.</p></div>
        <div class="help-turn"><strong>Kolibri</strong><p>Then the output may look right for the examples you noticed while still failing the full requirement. Check the transport record and run it again.</p></div>
      </div>
    </section>

    <section class="section" id="projects" aria-labelledby="projects-title">
      <h2 id="projects-title">Projects begin with a problem</h2>
      <p>Kolibri projects should begin with something the learner noticed rather than a list of technologies that must be included. The problem may be personal, connected to a group they belong to, or based on work they already do. It does not have to be original enough to become a company. It has to be specific enough that a small working version would be useful.</p>
      <p>The learner then has to decide what the project should accept, what it should do, what it should produce, and what can be postponed. Concepts from earlier lessons become available tools, but the course does not prescribe which combination must be used.</p>
      <p>A finished project should be small enough to explain. The learner should know what problem it addresses, which decisions they made, what failed during development, and what remains unresolved.</p>
      <div class="project-record-flow" aria-label="Project record fields">
        <span>The problem the learner noticed</span>
        <span>The first proposed approach</span>
        <span>A small working version</span>
        <span>A failed or discarded approach</span>
        <span>The current code</span>
        <span>A public result when appropriate</span>
        <span>A short explanation of the decisions</span>
        <span>What the learner would change next</span>
      </div>
    </section>

    <section class="section section-overlap" id="project-record" aria-labelledby="record-title">
      <h2 id="record-title">The work should show how it changed</h2>
      <p>A project is more useful to another person when it includes more than the final screen. Kolibri should preserve enough of the process to show where the idea came from, how the first version differed from the current one, which assumptions failed, and why certain decisions were made.</p>
      <p>A completed project may eventually have a public page containing the result, repository, notes, and development history. Another learner should be able to understand the work without having been present while it was made.</p>
      <p>For now, this is a format for presenting projects clearly. Do not describe it as a feed, network, social platform, community, creator system, or social media for code.</p>
      <article class="project-concept" aria-label="Shared expense checker product concept">
        <p class="concept-label">PRODUCT CONCEPT</p>
        <h3>SHARED EXPENSE CHECKER</h3>
        <p class="project-problem">Three housemates record shared expenses in different places, then disagree about who paid for what at the end of the month.</p>
        <dl class="project-stages">
          <div><dt>Observation</dt><dd>Expenses are spread across chat messages, receipts, and individual notes.</dd></div>
          <div><dt>First idea</dt><dd>A shared form that stores each expense and calculates the current balance.</dd></div>
          <div><dt>Reduced version</dt><dd>One page where a person can add an expense, assign who paid, and see a simple balance.</dd></div>
          <div><dt>Discarded approach</dt><dd>Automatic receipt scanning was removed from the first version because it added setup and error cases before the basic record worked.</dd></div>
          <div><dt>Current result</dt><dd>A working shared ledger with manual entries and a monthly summary.</dd></div>
          <div><dt>Still unresolved</dt><dd>Editing mistakes and handling expenses shared by only part of the group.</dd></div>
        </dl>
      </article>
    </section>

    <section class="section" id="progress" aria-labelledby="progress-title">
      <h2 id="progress-title">Progress is becoming less dependent on the course</h2>
      <p>Finishing lessons matters, but it is not the final measure of progress. A learner is making progress when they can recognize an idea in a new setting, investigate a failure without immediately asking for the answer, reduce an oversized plan, and complete a useful version of something they chose.</p>
      <p>Kolibri can still remember completed lessons, saved work, project status, and where someone stopped. Those records should help the learner return to the work. They should not become the reason the learner continues.</p>
      <p>Do not add daily streaks, points, rankings, completion pressure, artificial scarcity, or engagement notifications.</p>
      <div class="progress-composition">
        <div class="progress-view" aria-label="Progress records concept">
          <div class="work-item"><span>Recognize a condition in a new setting</span><span>IN PROGRESS</span></div>
          <div class="work-item"><span>Shared expense checker draft</span><span>SAVED</span></div>
          <div class="work-item"><span>Return to unfinished lesson</span><span>RESUME</span></div>
        </div>
        <!-- Claude Monet, Water Lilies (1922).
             Wikimedia Commons source: https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_Google_Art_Project.jpg
             Public Domain Mark 1.0; local 1280px derivative, decorative use. -->
        <div class="painting-atmosphere painting-monet" aria-hidden="true">
          <img src="/assets/monet-water-lilies.webp" alt="" width="1280" height="1202" loading="lazy" decoding="async" />
        </div>
      </div>
    </section>

    <section class="section" id="current-state" aria-labelledby="state-title">
      <div class="state-grid">
        <div>
          <h2 id="state-title">What exists now</h2>
          <p>Kolibri is still being built. The material comes from programming lessons I have taught directly and from helping people turn rough ideas into portfolio projects. Those sessions have made certain problems difficult to ignore. People can often generate code before they know how to inspect it, choose a reasonable scope, or decide what should happen after the first version works.</p>
          <p>The next work is turning those observations into an online course with interactive lessons, useful feedback, and projects that gradually require more independent judgment. The final curriculum, interface, price, and release plan have not been decided yet.</p>
          <div class="state-links">
            <a class="portfolio-link" href="https://vstal.in/portfolio">See previous work</a>
            <a class="portfolio-link" href="https://alignment.id">Alignment</a>
          </div>
        </div>
        <figure class="poster-figure">
          <img src="/assets/vibe-coding-dari-nol-poster.png" alt="Poster from earlier programming teaching that informed Kolibri" width="1080" height="1350" loading="lazy" decoding="async" />
          <figcaption>Earlier teaching material used while developing Kolibri</figcaption>
        </figure>
      </div>
    </section>

    <section class="section waitlist-section" id="waitlist" aria-labelledby="waitlist-title">
      <div class="waitlist-layout">
        <div class="waitlist-main">
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
          <pre class="waitlist-wave-art" data-ascii-fit>${esc(wave)}</pre>
        </div>
      </div>
    </section>

    <section class="section section-final" id="final" aria-labelledby="final-title">
      <div class="final-grid">
        <div class="final-copy">
          <h2 id="final-title">The course should make itself less necessary</h2>
          <p>Kolibri will have succeeded when a learner can encounter a problem, decide whether code could help, and make a reasonable first attempt without waiting for a course to describe every step. They may still need documentation, other people, or AI. The difference is that those tools support their judgment instead of replacing it.</p>
        </div>
        <pre class="bird-small" aria-hidden="true">${esc(bird)}</pre>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__grid">
        <div><p class="site-footer__column-title">Alignment</p><div class="site-footer__column-stack"><a href="https://alignment.id" class="site-footer__column-link">Home</a><a href="https://gray.alignment.id" class="site-footer__column-link">Gray</a><a href="https://alignment.id/#research" class="site-footer__column-link">Research</a><a href="/" class="site-footer__column-link">Kolibri</a></div></div>
        <div><p class="site-footer__column-title">Kolibri</p><div class="site-footer__column-stack"><a href="https://vstal.in/portfolio" class="site-footer__column-link">Portfolio</a><a href="mailto:hi@alignment.id" class="site-footer__column-link">Contact</a></div></div>
        <div><p class="site-footer__column-title">Policies</p><div class="site-footer__column-stack"><a href="https://alignment.id/policies/tos" class="site-footer__column-link">Terms</a><a href="https://alignment.id/policies/privacy" class="site-footer__column-link">Privacy</a></div></div>
      </div>
      <p class="site-footer__meta">© 2026 Alignment.</p>
    </div>
  </footer>

  <noscript>
    <style>.lesson-shell textarea{display:none}</style>
    <p class="noscript-note">JavaScript is required for the interactive lesson demonstration. The rest of this page remains readable without it.</p>
  </noscript>
  <script type="module" src="/app.js?v=${jsVersion}"></script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('built index.html');
