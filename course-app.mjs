import { course } from './course-content.mjs';
import { evaluateTests, normalizeLines, normalizeText } from './course-evaluator.mjs';
import {
  MAX_CODE_BYTES,
  PROGRESS_KEY,
  STATES,
  createProgress,
  deriveChallengeState,
  isComplete,
  normalizeProgress,
  orderedChallenges,
} from './course-state.mjs';

const MAX_OUTPUT_BYTES = 64 * 1024;
const RUN_TIMEOUT_MS = 2000;

const scriptJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

export function createRunnerDocument(challenge) {
  const tests = scriptJson(challenge.tests);
  const challengeId = scriptJson(challenge.id);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'" />
</head>
<body>
  <!-- The parent applies sandbox="allow-scripts" only. -->
  <script>
    const CHALLENGE_ID = ${challengeId};
    const TESTS = ${tests};
    const MAX_CODE_BYTES = ${MAX_CODE_BYTES};
    const MAX_OUTPUT_BYTES = ${MAX_OUTPUT_BYTES};
    ${normalizeLines.toString()}
    ${normalizeText.toString()}
    ${evaluateTests.toString()}

    const cleanError = (error) => ({
      name: String(error?.name || 'RuntimeError').slice(0, 80),
      message: String(error?.message || 'The program could not run.').slice(0, 240),
    });
    const send = (data) => parent.postMessage(data, '*');

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (event.source !== parent || !data || data.type !== 'run' || data.challengeId !== CHALLENGE_ID) return;
      if (typeof data.runId !== 'number' || typeof data.code !== 'string') return;

      const codeBytes = new TextEncoder().encode(data.code).byteLength;
      if (codeBytes > MAX_CODE_BYTES) {
        const error = { name: 'CodeLimitError', message: 'The code buffer is larger than the allowed limit.' };
        const result = evaluateTests({ tests: TESTS }, { consoleLines: [], appText: '' }, error);
        send({ version: 1, type: 'result', runId: data.runId, challengeId: CHALLENGE_ID, ok: false, checks: result.checks, error: result.error });
        return;
      }

      const app = document.createElement('div');
      app.id = 'app';
      document.body.appendChild(app);
      const consoleLines = [];
      let outputBytes = 0;
      let outputError = null;
      console.log = (...args) => {
        if (outputError) return;
        const line = args.map(String).join(' ');
        const bytes = new TextEncoder().encode(line).byteLength + 1;
        if (outputBytes + bytes > MAX_OUTPUT_BYTES) {
          outputError = { name: 'OutputLimitError', message: 'The program produced too much output.' };
          return;
        }
        outputBytes += bytes;
        consoleLines.push(line);
      };

      let finished = false;
      const finish = (error = null) => {
        if (finished) return;
        finished = true;
        window.removeEventListener('error', onError);
        const result = evaluateTests(
          { tests: TESTS },
          { consoleLines, appText: app.textContent },
          error || outputError,
        );
        send({ version: 1, type: 'result', runId: data.runId, challengeId: CHALLENGE_ID, ok: result.ok, checks: result.checks, error: result.error });
      };
      const onError = (event) => {
        event.preventDefault();
        finish(cleanError(event.error || { name: 'RuntimeError', message: event.message }));
      };
      window.addEventListener('error', onError);

      const script = document.createElement('script');
      script.textContent = data.code;
      document.body.appendChild(script);
      setTimeout(() => finish(), 0);
    });
  </script>
</body>
</html>`;
}

export function isValidResult(value, runId, challengeId) {
  if (!value || typeof value !== 'object') return false;
  if (value.version !== 1 || value.type !== 'result') return false;
  if (value.runId !== runId || value.challengeId !== challengeId || typeof value.ok !== 'boolean') return false;
  if (!Array.isArray(value.checks)) return false;
  if (!value.checks.every((check) => check && typeof check.id === 'string' && typeof check.pass === 'boolean')) return false;
  return value.error === null || (
    value.error && typeof value.error === 'object'
    && typeof value.error.name === 'string'
    && typeof value.error.message === 'string'
  );
}

const focus = (element) => {
  try { element.focus({ preventScroll: true }); } catch { element.focus(); }
};
const bytes = (value) => new TextEncoder().encode(value).byteLength;
const formatValue = (value) => JSON.stringify(value);

function storageState() {
  try {
    const storage = window.localStorage;
    const raw = storage.getItem(PROGRESS_KEY);
    return {
      storage,
      progress: raw ? normalizeProgress(course, JSON.parse(raw)) : createProgress(course),
      notice: null,
    };
  } catch {
    return {
      storage: null,
      progress: createProgress(course),
      notice: 'Progress will not survive reload in this browser.',
    };
  }
}

function createSandboxRun(challenge, code, runId) {
  let resolveRun;
  let finished = false;
  const promise = new Promise((resolve) => { resolveRun = resolve; });
  const iframe = document.createElement('iframe');
  iframe.className = 'course-runner';
  iframe.title = 'Isolated code test runner';
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.srcdoc = createRunnerDocument(challenge);

  let timeoutId = 0;
  const finish = (result) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeoutId);
    window.removeEventListener('message', onMessage);
    iframe.remove();
    resolveRun(result);
  };
  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (!isValidResult(event.data, runId, challenge.id)) return;
    finish(event.data);
  };
  const cancel = () => finish(null);
  const onLoad = () => {
    iframe.contentWindow?.postMessage({ type: 'run', runId, challengeId: challenge.id, code }, '*');
  };

  window.addEventListener('message', onMessage);
  iframe.addEventListener('load', onLoad, { once: true });
  document.body.appendChild(iframe);
  timeoutId = window.setTimeout(() => finish({
    version: 1,
    type: 'result',
    runId,
    challengeId: challenge.id,
    ok: false,
    checks: [],
    error: { name: 'TimeoutError', message: 'The program did not finish before the time limit.' },
  }), RUN_TIMEOUT_MS);

  return { promise, cancel };
}

export function initCourse() {
  const shell = document.querySelector('[data-course-shell]');
  if (!shell) return;

  const map = document.getElementById('course-map');
  const breadcrumb = document.getElementById('course-breadcrumb');
  const title = document.getElementById('course-challenge-title');
  const concept = document.getElementById('course-concept');
  const explanation = document.getElementById('course-explanation');
  const instruction = document.getElementById('course-instruction');
  const editor = document.getElementById('course-editor');
  const runButton = document.getElementById('course-run');
  const resetButton = document.getElementById('course-reset');
  const nextButton = document.getElementById('course-next');
  const feedback = document.getElementById('course-feedback');
  const hints = document.getElementById('course-hints');
  const completion = document.getElementById('course-completion');
  const storageNote = document.getElementById('course-storage-note');
  if (!map || !breadcrumb || !title || !concept || !explanation || !instruction || !editor || !runButton || !resetButton || !nextButton || !feedback || !hints || !completion) return;

  const entries = orderedChallenges(course);
  const entryById = new Map(entries.map((entry) => [entry.challenge.id, entry]));
  const stored = storageState();
  let storage = stored.storage;
  let progress = stored.progress;
  let storageNotice = stored.notice;
  let runtime = { challengeId: null, state: STATES.READY, runId: 0, run: null };

  const setStorageNotice = () => {
    if (!storageNote) return;
    storageNote.hidden = !storageNotice;
    storageNote.textContent = storageNotice || '';
  };
  const save = () => {
    if (!storage) return;
    try {
      storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      storage = null;
      storageNotice = 'Progress will not survive reload in this browser.';
      setStorageNotice();
    }
  };
  setStorageNotice();

  const firstIncompleteId = () => entries.find(({ challenge }) => !progress.passedIds.includes(challenge.id))?.challenge.id
    ?? entries.at(-1)?.challenge.id
    ?? null;
  const stateFor = (challenge) => deriveChallengeState(challenge, progress, runtime);
  const currentEntry = () => entryById.get(runtime.challengeId);

  const setFeedback = (message, status) => {
    feedback.dataset.status = status;
    feedback.className = `course-feedback course-feedback--${status}`;
    feedback.textContent = message;
  };

  const syncActions = (challenge, state) => {
    runButton.disabled = state === STATES.RUNNING || state === STATES.PASSED;
    resetButton.disabled = state === STATES.RUNNING;
    nextButton.disabled = state !== STATES.PASSED || !challenge.nextId;
    nextButton.textContent = challenge.nextId ? 'Next challenge' : 'Finish lesson';
  };

  const renderMap = () => {
    map.replaceChildren();
    for (const { challenge } of entries) {
      const state = stateFor(challenge);
      const item = document.createElement('li');
      item.dataset.state = state;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'course-map-button';
      button.dataset.challengeId = challenge.id;
      button.dataset.state = state;
      button.disabled = state === STATES.LOCKED;
      button.setAttribute('aria-disabled', String(state === STATES.LOCKED));
      if (challenge.id === runtime.challengeId) button.setAttribute('aria-current', 'step');
      const number = document.createElement('span');
      number.className = 'course-map-number';
      number.textContent = String(challenge.position).padStart(2, '0');
      const label = document.createElement('span');
      label.className = 'course-map-title';
      label.textContent = challenge.title;
      const status = document.createElement('span');
      status.className = 'course-map-status';
      status.textContent = state === STATES.PASSED ? 'Passed' : state === STATES.LOCKED ? 'Locked' : state === STATES.FAILED ? 'Try again' : 'Ready';
      button.append(number, label, status);
      if (state === STATES.LOCKED) button.title = 'Complete the previous challenge first.';
      else button.addEventListener('click', () => selectChallenge(challenge.id));
      item.appendChild(button);
      map.appendChild(item);
    }
  };

  const renderHints = (challenge) => {
    hints.replaceChildren();
    const heading = document.createElement('p');
    heading.className = 'course-hints-title';
    heading.textContent = 'Need a nudge?';
    hints.appendChild(heading);
    for (const [index, hint] of challenge.hints.entries()) {
      const detail = document.createElement('details');
      detail.className = 'course-hint';
      const summary = document.createElement('summary');
      summary.textContent = `Hint ${index + 1}: ${hint.level}`;
      const body = document.createElement('p');
      body.textContent = hint.text;
      detail.append(summary, body);
      hints.appendChild(detail);
    }
  };

  const renderExplanation = (entry) => {
    explanation.replaceChildren();
    const objective = document.createElement('p');
    objective.textContent = entry.lesson.objective;
    const definition = document.createElement('p');
    definition.textContent = `${entry.challenge.concept}: ${entry.lesson.glossary[entry.challenge.concept]}`;
    explanation.append(objective, definition);
  };

  const renderFailure = (challenge, result) => {
    if (result.error) {
      if (result.error.name === 'TimeoutError') return challenge.feedback.timeout;
      if (result.error.name === 'CodeLimitError') return 'Keep your code under 50 KiB, then run the tests again.';
      if (result.error.name === 'OutputLimitError') return 'Your program produced too much output. Log only the value needed for this check.';
      return `${challenge.feedback.runtime} Error: ${result.error.message}`;
    }
    const check = result.checks.find((item) => !item.pass) || result.checks[0];
    if (!check) return 'The tests did not return a usable result. Try running again.';
    const message = challenge.feedback.failures[check.id] || check.message;
    return `${message} Expected ${formatValue(check.expected)}; received ${formatValue(check.actual)}.`;
  };

  const renderChallenge = (shouldFocus = true) => {
    const entry = currentEntry();
    if (!entry) return;
    const { challenge } = entry;
    const state = stateFor(challenge);
    breadcrumb.textContent = `${course.title} / ${entry.module.title} / ${entry.lesson.title}`;
    title.textContent = challenge.title;
    concept.textContent = `Concept: ${challenge.concept}`;
    renderExplanation(entry);
    instruction.textContent = challenge.instruction;
    editor.value = progress.drafts[challenge.id] ?? challenge.starter;
    editor.readOnly = state === STATES.PASSED;
    completion.hidden = !isComplete(course, progress);
    completion.textContent = isComplete(course, progress) ? entry.lesson.completion : '';
    renderHints(challenge);
    syncActions(challenge, state);
    if (state === STATES.PASSED) setFeedback(challenge.feedback.pass, 'pass');
    else if (state === STATES.FAILED) setFeedback('The last run did not pass. Fix the code or use a hint, then run it again.', 'fail');
    else setFeedback('Edit the starter code, then run the tests.', 'ready');
    renderMap();
    if (shouldFocus) focus(editor);
  };

  const setHash = (id, replace = false) => {
    if (!window.location) return;
    const hash = `#course/${encodeURIComponent(id)}`;
    if (window.location.hash === hash) return;
    if (replace && window.history?.replaceState) window.history.replaceState(null, '', hash);
    else window.location.hash = hash;
  };

  const cancelRun = () => {
    runtime.runId += 1;
    runtime.run?.cancel();
    runtime.run = null;
    runtime.state = STATES.READY;
  };

  function selectChallenge(id, options = {}) {
    cancelRun();
    const candidate = entryById.get(id);
    const candidateState = candidate ? stateFor(candidate.challenge) : STATES.LOCKED;
    const targetId = candidate && candidateState !== STATES.LOCKED ? id : firstIncompleteId();
    if (!targetId) return;
    progress.currentChallengeId = targetId;
    save();
    runtime = { challengeId: targetId, state: STATES.READY, runId: runtime.runId, run: null };
    if (options.updateHash !== false) setHash(targetId, Boolean(options.replaceHash));
    renderChallenge(options.focus !== false);
  }

  const runCurrent = async () => {
    const entry = currentEntry();
    if (!entry) return;
    const { challenge } = entry;
    const state = stateFor(challenge);
    if (state === STATES.RUNNING || state === STATES.PASSED) return;
    const code = editor.value;
    if (bytes(code) > MAX_CODE_BYTES) {
      runtime.state = STATES.FAILED;
      setFeedback('Keep your code under 50 KiB, then run the tests again.', 'fail');
      renderMap();
      focus(editor);
      return;
    }
    progress.drafts[challenge.id] = code;
    save();
    const runId = runtime.runId + 1;
    runtime.runId = runId;
    runtime.state = STATES.RUNNING;
    syncActions(challenge, STATES.RUNNING);
    renderMap();
    setFeedback('Running tests…', 'running');
    focus(feedback);
    const run = createSandboxRun(challenge, code, runId);
    runtime.run = run;
    const result = await run.promise;
    if (runtime.runId !== runId || runtime.challengeId !== challenge.id || !result) return;
    runtime.run = null;
    if (!isValidResult(result, runId, challenge.id)) return;
    if (result.ok) {
      if (!progress.passedIds.includes(challenge.id)) progress.passedIds.push(challenge.id);
      progress.drafts[challenge.id] = code;
      runtime.state = STATES.PASSED;
      save();
      renderMap();
      syncActions(challenge, STATES.PASSED);
      setFeedback(challenge.feedback.pass, 'pass');
      completion.hidden = !isComplete(course, progress);
      completion.textContent = isComplete(course, progress) ? entry.lesson.completion : '';
      focus(nextButton.disabled ? completion : nextButton);
    } else {
      runtime.state = STATES.FAILED;
      save();
      renderMap();
      syncActions(challenge, STATES.FAILED);
      setFeedback(renderFailure(challenge, result), 'fail');
      focus(editor);
    }
  };

  runButton.addEventListener('click', runCurrent);
  resetButton.addEventListener('click', () => {
    const entry = currentEntry();
    if (!entry || runtime.state === STATES.RUNNING) return;
    const state = stateFor(entry.challenge);
    delete progress.drafts[entry.challenge.id];
    save();
    editor.value = entry.challenge.starter;
    runtime.state = state === STATES.PASSED ? STATES.PASSED : STATES.READY;
    renderMap();
    syncActions(entry.challenge, runtime.state);
    setFeedback(runtime.state === STATES.PASSED ? entry.challenge.feedback.pass : 'Starter restored. Run the tests when you are ready.', runtime.state === STATES.PASSED ? 'pass' : 'ready');
    focus(editor);
  });
  nextButton.addEventListener('click', () => {
    const entry = currentEntry();
    if (!entry || runtime.state !== STATES.PASSED || !entry.challenge.nextId) return;
    selectChallenge(entry.challenge.nextId);
  });
  editor.addEventListener('input', () => {
    const entry = currentEntry();
    if (!entry || editor.readOnly) return;
    if (bytes(editor.value) <= MAX_CODE_BYTES) {
      progress.drafts[entry.challenge.id] = editor.value;
      save();
    }
  });
  editor.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runCurrent();
    }
  });
  window.addEventListener('hashchange', () => {
    const prefix = '#course/';
    const id = window.location.hash.startsWith(prefix)
      ? decodeURIComponent(window.location.hash.slice(prefix.length))
      : null;
    selectChallenge(id, { updateHash: false });
  });

  const prefix = '#course/';
  const hashId = window.location?.hash.startsWith(prefix)
    ? decodeURIComponent(window.location.hash.slice(prefix.length))
    : null;
  const initialId = hashId || progress.currentChallengeId || firstIncompleteId();
  const initialEntry = entryById.get(initialId);
  const initialState = initialEntry ? stateFor(initialEntry.challenge) : STATES.LOCKED;
  const targetId = initialEntry && initialState !== STATES.LOCKED ? initialId : firstIncompleteId();
  if (targetId) {
    progress.currentChallengeId = targetId;
    save();
    runtime = { challengeId: targetId, state: STATES.READY, runId: 0, run: null };
    setHash(targetId, true);
    renderChallenge(true);
  }
}
