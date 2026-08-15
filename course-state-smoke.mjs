import assert from 'node:assert/strict';
import { course } from './course-content.mjs';
import {
  PROGRESS_KEY,
  STATES,
  createProgress,
  deriveChallengeState,
  normalizeProgress,
  orderedChallenges,
} from './course-state.mjs';

const challenges = orderedChallenges(course);
const ids = challenges.map(({ challenge }) => challenge.id);

assert.equal(PROGRESS_KEY, 'kolibri.progress.v1');
assert.deepEqual(ids, [
  'js-foundations-m01-l01-c01',
  'js-foundations-m01-l01-c02',
  'js-foundations-m01-l01-c03',
]);

const fresh = createProgress(course);
assert.equal(fresh.currentChallengeId, ids[0]);
assert.deepEqual(fresh.passedIds, []);
assert.equal(deriveChallengeState(challenges[0].challenge, fresh), STATES.READY);
assert.equal(deriveChallengeState(challenges[1].challenge, fresh), STATES.LOCKED);

const afterFirst = normalizeProgress(course, {
  version: 1,
  courseId: course.id,
  currentChallengeId: ids[2],
  passedIds: [ids[0]],
  drafts: { [ids[1]]: 'let count = 2;' },
});
assert.equal(afterFirst.currentChallengeId, ids[1]);
assert.deepEqual(afterFirst.passedIds, [ids[0]]);
assert.equal(afterFirst.drafts[ids[1]], 'let count = 2;');
assert.equal(deriveChallengeState(challenges[0].challenge, afterFirst), STATES.PASSED);
assert.equal(deriveChallengeState(challenges[1].challenge, afterFirst), STATES.READY);
assert.equal(deriveChallengeState(challenges[2].challenge, afterFirst), STATES.LOCKED);

const corruptOrder = normalizeProgress(course, {
  version: 1,
  courseId: course.id,
  currentChallengeId: ids[0],
  passedIds: [ids[1], 'not-a-challenge', ids[0]],
  drafts: { [ids[0]]: 'ok', unknown: 'discard me' },
});
assert.deepEqual(corruptOrder.passedIds, [ids[0]]);
assert.equal(corruptOrder.currentChallengeId, ids[0]);
assert.deepEqual(corruptOrder.drafts, { [ids[0]]: 'ok' });

console.log('course state smoke ok');
