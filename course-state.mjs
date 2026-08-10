export const PROGRESS_KEY = 'kolibri.progress.v1';
export const MAX_CODE_BYTES = 50 * 1024;
export const STATES = Object.freeze({
  LOCKED: 'LOCKED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  FAILED: 'FAILED',
  PASSED: 'PASSED',
  COMPLETE: 'COMPLETE',
});

const byteLength = (value) => new TextEncoder().encode(value).byteLength;

export function orderedChallenges(course) {
  return course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.challenges.map((challenge) => ({ module, lesson, challenge })))
  );
}

export function createProgress(course) {
  const first = orderedChallenges(course)[0]?.challenge.id ?? null;
  return {
    version: 1,
    courseId: course.id,
    currentChallengeId: first,
    passedIds: [],
    drafts: {},
  };
}

export function normalizeProgress(course, candidate) {
  const fresh = createProgress(course);
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return fresh;
  if (candidate.version !== 1 || candidate.courseId !== course.id) return fresh;

  const entries = orderedChallenges(course);
  const passedInput = Array.isArray(candidate.passedIds) ? candidate.passedIds : [];
  const passedIds = [];
  for (const id of passedInput) {
    if (id === entries[passedIds.length]?.challenge.id) passedIds.push(id);
  }

  const knownIds = new Set(entries.map(({ challenge }) => challenge.id));
  const drafts = {};
  if (candidate.drafts && typeof candidate.drafts === 'object' && !Array.isArray(candidate.drafts)) {
    for (const [id, code] of Object.entries(candidate.drafts)) {
      if (knownIds.has(id) && typeof code === 'string' && byteLength(code) <= MAX_CODE_BYTES) drafts[id] = code;
    }
  }

  const firstIncomplete = entries.find(({ challenge }) => !passedIds.includes(challenge.id))?.challenge.id ?? null;
  const current = entries.find(({ challenge }) => challenge.id === candidate.currentChallengeId);
  const currentIndex = current ? entries.indexOf(current) : -1;
  const isUnlocked = currentIndex >= 0 && currentIndex <= passedIds.length;

  return {
    version: 1,
    courseId: course.id,
    currentChallengeId: isUnlocked ? current.challenge.id : (firstIncomplete ?? entries.at(-1)?.challenge.id ?? null),
    passedIds,
    drafts,
  };
}

export function deriveChallengeState(challenge, progress, runtime = {}) {
  if (progress.passedIds.includes(challenge.id)) return STATES.PASSED;
  if (!challenge.prerequisites.every((id) => progress.passedIds.includes(id))) return STATES.LOCKED;
  if (runtime.challengeId === challenge.id && runtime.state === STATES.RUNNING) return STATES.RUNNING;
  if (runtime.challengeId === challenge.id && runtime.state === STATES.FAILED) return STATES.FAILED;
  return STATES.READY;
}

export function isComplete(course, progress) {
  return orderedChallenges(course).every(({ challenge }) => progress.passedIds.includes(challenge.id));
}
