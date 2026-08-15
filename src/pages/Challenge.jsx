import { useState, useEffect, useRef } from 'react';
import { course } from '../../course-content.mjs';
import { deriveChallengeState, STATES, isComplete } from '../../course-state.mjs';
import { createSandboxRunner, loadProgress, saveProgress, advance } from '@/lib/course';

const stateLabel = {
  [STATES.LOCKED]: 'Locked',
  [STATES.READY]: 'Ready',
  [STATES.RUNNING]: 'Running',
  [STATES.FAILED]: 'Try again',
  [STATES.PASSED]: 'Passed',
};

function entries() {
  return course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.challenges.map((challenge) => ({ module, lesson, challenge })))
  );
}

const formatValue = (value) => JSON.stringify(value);

export default function Challenge({ challengeId, onExit, onSelect }) {
  const all = useRef(entries()).current;
  const entry = all.find(({ challenge }) => challenge.id === challengeId);
  const [progress, setProgress] = useState(() => loadProgress());
  const [code, setCode] = useState(() => progress.drafts[challengeId] ?? entry?.challenge.starter ?? '');
  const [runtime, setRuntime] = useState({ challengeId, state: STATES.READY, result: null });
  const [storageFailed, setStorageFailed] = useState(false);
  const runnerRef = useRef(null);
  const saveTimer = useRef(0);

  useEffect(() => {
    runnerRef.current = createSandboxRunner(entry.challenge);
    return () => runnerRef.current?.dispose();
  }, [entry.challenge]);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setProgress((prev) => {
        const next = { ...prev, drafts: { ...prev.drafts, [challengeId]: code } };
        if (!saveProgress(next)) setStorageFailed(true);
        return next;
      });
    }, 300);
  }, [code, challengeId]);

  if (!entry) return null;
  const { module, lesson, challenge } = entry;
  const state = deriveChallengeState(challenge, progress, runtime);

  const handleRun = async () => {
    if (state === STATES.RUNNING || state === STATES.PASSED) return;
    setRuntime({ challengeId: challenge.id, state: STATES.RUNNING, result: null });
    const result = await runnerRef.current.run(code);
    const nextRuntime = { challengeId: challenge.id, state: result.ok ? STATES.PASSED : STATES.FAILED, result };
    setRuntime(nextRuntime);
    if (result.ok) {
      setProgress((prev) => {
        const next = advance(prev, challenge.id);
        saveProgress(next);
        return next;
      });
    }
  };

  const handleReset = () => {
    setCode(challenge.starter);
    setRuntime({ challengeId: challenge.id, state: STATES.READY, result: null });
    setProgress((prev) => {
      const next = { ...prev, drafts: { ...prev.drafts } };
      delete next.drafts[challenge.id];
      saveProgress(next);
      return next;
    });
  };

  const handleNext = () => {
    if (challenge.nextId) onSelect?.(challenge.nextId);
    else onExit?.();
  };

  const locked = state === STATES.LOCKED;
  const running = state === STATES.RUNNING;
  const passed = state === STATES.PASSED;

  // Feedback text, ported from course-app.mjs renderFailure / renderChallenge.
  let feedbackText = null;
  let feedbackState = null;
  if (locked) {
    feedbackText = 'Complete the previous challenge to unlock this one.';
  } else if (running) {
    feedbackText = 'Running tests…';
    feedbackState = 'running';
  } else if (runtime.result) {
    if (runtime.result.ok) {
      feedbackText = challenge.feedback.pass;
      feedbackState = 'pass';
    } else if (runtime.result.error) {
      const { name, message } = runtime.result.error;
      if (name === 'TimeoutError') feedbackText = challenge.feedback.timeout;
      else if (name === 'CodeLimitError') feedbackText = 'Keep your code under 50 KiB, then run the tests again.';
      else if (name === 'OutputLimitError') feedbackText = 'Your program produced too much output. Log only the value needed for this check.';
      else feedbackText = `${challenge.feedback.runtime} Error: ${message}`;
      feedbackState = 'fail';
    } else {
      const check = runtime.result.checks.find((item) => !item.pass) || runtime.result.checks[0];
      if (!check) {
        feedbackText = 'The tests did not return a usable result. Try running again.';
      } else {
        const message = challenge.feedback.failures?.[check.id] || check.message;
        feedbackText = `${message} Expected ${formatValue(check.expected)}; received ${formatValue(check.actual)}.`;
      }
      feedbackState = 'fail';
    }
  }

  const definition = lesson.glossary?.[challenge.concept];
  const complete = isComplete(course, progress);

  return (
    <section className="course-section" aria-labelledby="course-title">
      <div className="course-header">
        <p className="course-eyebrow">JavaScript Foundations · preview</p>
        <h2 id="course-title">Learn one idea. Use it. See what happens.</h2>
        <p>
          Read a short explanation, change a few lines, run the checks, and use the feedback to fix your code.
          Finish one small challenge before the next one opens.
        </p>
      </div>

      <div className="course-layout">
        <nav className="course-map-panel" aria-label="Course map">
          <p className="course-panel-label">Course map</p>
          <ol>
            {all.map(({ challenge: c }) => {
              const st = deriveChallengeState(c, progress, runtime);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="course-map-button"
                    data-state={st === STATES.PASSED ? 'PASSED' : st === STATES.FAILED ? 'FAILED' : undefined}
                    aria-current={c.id === challenge.id ? 'step' : undefined}
                    disabled={st === STATES.LOCKED}
                    onClick={() => onSelect?.(c.id)}
                  >
                    <span className="course-map-number">{String(c.position).padStart(2, '0')}</span>
                    <span className="course-map-title">{c.title}</span>
                    <span className="course-map-status">{stateLabel[st]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="course-workspace">
          {storageFailed && (
            <p className="course-storage-note" role="status">
              Progress will not survive reload in this browser.
            </p>
          )}
          <p className="course-breadcrumb">{course.title} / {module.title} / {lesson.title}</p>
          <h3>{challenge.title}</h3>
          <p className="course-concept">{challenge.concept}</p>
          <div className="course-explanation">
            <p>{lesson.objective}</p>
            {definition && <p>{challenge.concept}: {definition}</p>}
          </div>
          <div className="course-task">{challenge.instruction}</div>
          {locked ? (
            <div className="course-feedback" role="status" aria-live="polite">{feedbackText}</div>
          ) : (
            <>
              <div className="course-editor-shell">
                <label htmlFor="course-editor">Your code</label>
                <textarea
                  id="course-editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={passed}
                  readOnly={passed}
                  spellCheck={false}
                  autocapitalize="off"
                  autoComplete="off"
                  aria-describedby="course-instruction"
                />
              </div>
              <div className="course-actions">
                <button type="button" className="course-button course-button--primary" onClick={handleRun} disabled={running || passed || !code.trim()}>
                  Run tests
                </button>
                <button type="button" className="course-button" onClick={handleReset} disabled={running}>
                  Reset
                </button>
                <button type="button" className="course-button" onClick={handleNext} disabled={!passed}>
                  {challenge.nextId ? 'Next challenge' : 'Finish lesson'}
                </button>
                <button type="button" className="course-button" onClick={() => onExit?.()}>All challenges</button>
              </div>
            </>
          )}
          {!locked && (
            <div className={`course-feedback${feedbackState ? ` course-feedback--${feedbackState}` : ''}`} role="status" aria-live="polite" tabIndex={-1}>
              {feedbackText ?? '\u00a0'}
            </div>
          )}
          {!locked && challenge.hints.length > 0 && (
            <div className="course-hints" aria-label="Hints">
              <p className="course-hints-title">Need a nudge?</p>
              {challenge.hints.map((hint, index) => (
                <details key={hint.level} className="course-hint">
                  <summary>Hint {index + 1}: {hint.level}</summary>
                  <p>{hint.text}</p>
                </details>
              ))}
            </div>
          )}
          {complete && <p className="course-completion" role="status">{course.modules[0].lessons[0].completion}</p>}
        </div>
      </div>
    </section>
  );
}
