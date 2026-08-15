import assert from 'node:assert/strict';
import { createRunnerDocument, isValidResult } from './course-app.mjs';

const challenge = {
  id: 'js-foundations-m01-l01-c01',
  tests: [{ id: 'console-output', type: 'console-lines', expected: ['Hello, Ada'], failure: 'Try again.' }],
};
const document = createRunnerDocument(challenge);

for (const marker of [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "connect-src 'none'",
  "form-action 'none'",
  'sandbox',
  'allow-scripts',
  'MAX_OUTPUT_BYTES',
]) assert.ok(document.includes(marker), `runner missing: ${marker}`);
assert.ok(!document.includes('allow-same-origin'), 'runner must not grant same-origin access');

const valid = {
  version: 1,
  type: 'result',
  runId: 7,
  challengeId: challenge.id,
  ok: false,
  checks: [{ id: 'console-output', pass: false, actual: ['Hello'], expected: ['Hello, Ada'], message: 'Try again.' }],
  error: null,
};
assert.equal(isValidResult(valid, 7, challenge.id), true);
assert.equal(isValidResult({ ...valid, runId: 6 }, 7, challenge.id), false);
assert.equal(isValidResult({ ...valid, challengeId: 'other' }, 7, challenge.id), false);
assert.equal(isValidResult({ ...valid, checks: 'not-an-array' }, 7, challenge.id), false);

console.log('course runner smoke ok');
