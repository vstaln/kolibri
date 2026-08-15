// React adapter over the pure course modules. The runner (sandboxed iframe) is
// ported verbatim from course-app.mjs; the progress helpers wrap course-state.mjs.
import { course } from '../../course-content.mjs';
import {
  PROGRESS_KEY,
  MAX_CODE_BYTES,
  createProgress,
  normalizeProgress,
  orderedChallenges,
} from '../../course-state.mjs';
import { evaluateTests, normalizeLines, normalizeText } from '../../course-evaluator.mjs';

export const MAX_OUTPUT_BYTES = 64 * 1024;
export const RUN_TIMEOUT_MS = 2000;

// --- sandboxed runner (ported from course-app.mjs, unchanged behavior) ---

const scriptJson = (value) => JSON.stringify(value);

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

// --- progress helpers ---

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? normalizeProgress(course, JSON.parse(raw)) : createProgress(course);
  } catch {
    return createProgress(course);
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function advance(progress, passedChallengeId) {
  const entries = orderedChallenges(course);
  const next = { ...progress, passedIds: [...progress.passedIds], drafts: { ...progress.drafts } };
  if (next.passedIds.includes(passedChallengeId)) return next;
  const idx = entries.findIndex(({ challenge }) => challenge.id === passedChallengeId);
  // Monotonic rule: only the next sequential challenge may be passed (matches normalizeProgress).
  if (idx !== next.passedIds.length) return next;
  next.passedIds.push(passedChallengeId);
  next.currentChallengeId = entries.find(({ challenge }) => !next.passedIds.includes(challenge.id))?.challenge.id
    ?? entries.at(-1)?.challenge.id
    ?? null;
  return next;
}

// --- sandboxed runner lifecycle ---

export function createSandboxRunner(challenge) {
  let runId = 0;
  let iframe = null;
  let onMessage = null;
  let onLoad = null;
  let timeoutId = 0;
  let disposed = false;

  const cleanup = () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (onMessage) window.removeEventListener('message', onMessage);
    if (onLoad && iframe) iframe.removeEventListener('load', onLoad);
    if (iframe) iframe.remove();
    iframe = null;
    onMessage = null;
    onLoad = null;
  };

  const run = (code) => new Promise((resolve) => {
    if (disposed) {
      resolve({ ok: false, checks: [], error: { name: 'DisposedError', message: 'Runner was disposed.' } });
      return;
    }
    cleanup();
    const id = ++runId;
    const frame = document.createElement('iframe');
    frame.className = 'course-runner';
    frame.title = 'Isolated code test runner';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.srcdoc = createRunnerDocument(challenge);
    iframe = frame;

    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
    };

    onMessage = (event) => {
      if (event.source !== frame.contentWindow) return;
      if (!isValidResult(event.data, id, challenge.id)) return;
      finish(event.data);
    };
    onLoad = () => {
      frame.contentWindow?.postMessage({ type: 'run', runId: id, challengeId: challenge.id, code }, '*');
    };

    window.addEventListener('message', onMessage);
    frame.addEventListener('load', onLoad, { once: true });
    document.body.appendChild(frame);
    timeoutId = window.setTimeout(() => finish({
      version: 1,
      type: 'result',
      runId: id,
      challengeId: challenge.id,
      ok: false,
      checks: [],
      error: { name: 'TimeoutError', message: 'The program did not finish before the time limit.' },
    }), RUN_TIMEOUT_MS);
  });

  return {
    run,
    dispose: () => {
      disposed = true;
      cleanup();
    },
  };
}
