import { describe, it, expect, beforeEach } from 'vitest';
import { course } from '../../course-content.mjs';
import { PROGRESS_KEY, createProgress } from '../../course-state.mjs';
import { loadProgress, saveProgress, advance, createRunnerDocument, isValidResult } from './course.js';

describe('course progress', () => {
  beforeEach(() => localStorage.clear());

  it('loadProgress returns a valid fresh progress when storage is empty', () => {
    const p = loadProgress();
    expect(p.courseId).toBe(course.id);
    expect(p.currentChallengeId).toBe('js-foundations-m01-l01-c01');
  });

  it('loadProgress normalizes corrupted storage', () => {
    localStorage.setItem(PROGRESS_KEY, 'not json');
    const p = loadProgress();
    expect(p.passedIds).toEqual([]);
  });

  it('advance marks the first challenge passed and unlocks the second', () => {
    const fresh = createProgress(course);
    const next = advance(fresh, 'js-foundations-m01-l01-c01');
    expect(next.passedIds).toContain('js-foundations-m01-l01-c01');
    expect(next.currentChallengeId).toBe('js-foundations-m01-l01-c02');
  });

  it('advance refuses out-of-order passes (monotonic rule)', () => {
    const fresh = createProgress(course);
    const next = advance(fresh, 'js-foundations-m01-l01-c02');
    expect(next.passedIds).toEqual([]);
    expect(next.currentChallengeId).toBe('js-foundations-m01-l01-c01');
  });

  it('saveProgress round-trips through loadProgress', () => {
    const fresh = createProgress(course);
    saveProgress(fresh);
    expect(loadProgress()).toEqual(fresh);
  });
});

describe('runner document', () => {
  it('builds a sandboxed document embedding the challenge tests', () => {
    const challenge = course.modules[0].lessons[0].challenges[0];
    const doc = createRunnerDocument(challenge);
    expect(doc).toContain('sandbox');
    expect(doc).toContain('console-lines');
    expect(doc).toContain('Hello, Ada');
    expect(doc).toContain("Content-Security-Policy");
  });

  it('validates runner results strictly', () => {
    const challenge = course.modules[0].lessons[0].challenges[0];
    const ok = { version: 1, type: 'result', runId: 1, challengeId: challenge.id, ok: true, checks: [], error: null };
    expect(isValidResult(ok, 1, challenge.id)).toBe(true);
    expect(isValidResult({ ...ok, runId: 2 }, 1, challenge.id)).toBe(false);
    expect(isValidResult({ ...ok, ok: 'yes' }, 1, challenge.id)).toBe(false);
    expect(isValidResult(null, 1, challenge.id)).toBe(false);
  });
});
