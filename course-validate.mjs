import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { course } from './course-content.mjs';
import { fixtures } from './course/fixtures/js-foundations.mjs';
import { evaluateTests } from './course-evaluator.mjs';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const errors = [];
const fail = (message) => errors.push(message);
const requireField = (value, label) => {
  if (value === undefined || value === null || value === '') fail(label + ' is required');
};
const allChallenges = course.modules.flatMap((module) =>
  module.lessons.flatMap((lesson) => lesson.challenges.map((challenge) => ({ module, lesson, challenge })))
);

function runCode(source) {
  const output = [];
  let appText = '';
  const app = { get textContent() { return appText; }, set textContent(value) { appText = String(value); } };
  const document = {
    querySelector(selector) {
      return selector === '#app' ? app : null;
    },
    getElementById(id) {
      return id === 'app' ? app : null;
    },
  };
  const context = vm.createContext({
    console: { log: (...args) => output.push(args.map(String).join(' ')) },
    document,
  });

  try {
    vm.runInContext(source, context, { timeout: 100 });
    return { output, appText, error: null };
  } catch (error) {
    return { output, appText, error: { name: error.name, message: error.message } };
  }
}

function checkShape() {
  requireField(course.schemaVersion, 'course.schemaVersion');
  requireField(course.id, 'course.id');
  requireField(course.title, 'course.title');
  if (!Array.isArray(course.modules) || course.modules.length === 0) fail('course.modules must be non-empty');

  const ids = new Set();
  const rememberId = (id, label) => {
    requireField(id, label);
    if (ids.has(id)) fail('duplicate id: ' + id);
    ids.add(id);
  };

  rememberId(course.id, 'course.id');
  for (const module of course.modules) {
    rememberId(module.id, 'module.id');
    requireField(module.title, module.id + '.title');
    if (!Array.isArray(module.lessons) || module.lessons.length === 0) fail(module.id + '.lessons must be non-empty');

    for (const lesson of module.lessons) {
      rememberId(lesson.id, 'lesson.id');
      requireField(lesson.title, lesson.id + '.title');
      requireField(lesson.objective, lesson.id + '.objective');
      if (!lesson.glossary || typeof lesson.glossary !== 'object') fail(lesson.id + '.glossary is required');
      if (!Array.isArray(lesson.challenges) || lesson.challenges.length === 0) fail(lesson.id + '.challenges must be non-empty');

      for (const [index, challenge] of lesson.challenges.entries()) {
        const label = lesson.id + ' challenge ' + (index + 1);
        rememberId(challenge.id, label + '.id');
        requireField(challenge.position, challenge.id + '.position');
        requireField(challenge.title, challenge.id + '.title');
        requireField(challenge.concept, challenge.id + '.concept');
        requireField(challenge.instruction, challenge.id + '.instruction');
        requireField(challenge.starter, challenge.id + '.starter');
        if (challenge.position !== index + 1) fail(challenge.id + '.position must be ' + (index + 1));
        if (!lesson.glossary[challenge.concept]) fail(challenge.id + '.concept is missing from the glossary');
        if (!Array.isArray(challenge.prerequisites)) fail(challenge.id + '.prerequisites must be an array');
        if (!Array.isArray(challenge.tests) || challenge.tests.length === 0) fail(challenge.id + '.tests must be non-empty');
        if (!Array.isArray(challenge.hints) || challenge.hints.length !== 3) fail(challenge.id + '.hints must have 3 levels');
        if (!Array.isArray(challenge.vocabulary)) fail(challenge.id + '.vocabulary must be an array');
        for (const term of challenge.vocabulary || []) {
          if (!lesson.glossary[term]) fail(challenge.id + '.vocabulary term missing from glossary: ' + term);
        }
        const levels = challenge.hints?.map((hint) => hint.level);
        if (JSON.stringify(levels) !== JSON.stringify(['nudge', 'direction', 'walkthrough'])) {
          fail(challenge.id + '.hints must be nudge/direction/walkthrough');
        }
        const testIds = new Set();
        for (const test of challenge.tests || []) {
          requireField(test.id, challenge.id + '.test.id');
          if (testIds.has(test.id)) fail('duplicate test id: ' + challenge.id + ':' + test.id);
          testIds.add(test.id);
          if (!['console-lines', 'app-text'].includes(test.type)) fail(challenge.id + ':' + test.id + ' has unsupported type');
          if (!Array.isArray(test.expected) && typeof test.expected !== 'string') fail(challenge.id + ':' + test.id + '.expected is invalid');
          requireField(test.failure, challenge.id + ':' + test.id + '.failure');
        }
        requireField(challenge.feedback?.pass, challenge.id + '.feedback.pass');
        requireField(challenge.feedback?.runtime, challenge.id + '.feedback.runtime');
        requireField(challenge.feedback?.timeout, challenge.id + '.feedback.timeout');
        for (const test of challenge.tests || []) {
          requireField(challenge.feedback?.failures?.[test.id], challenge.id + '.feedback.failures.' + test.id);
        }
        const expectedNext = lesson.challenges[index + 1]?.id ?? null;
        if (challenge.nextId !== expectedNext) fail(challenge.id + '.nextId must be ' + (expectedNext ?? 'null'));
        for (const prerequisite of challenge.prerequisites || []) {
          const prerequisiteIndex = lesson.challenges.findIndex((item) => item.id === prerequisite);
          if (prerequisiteIndex < 0 || prerequisiteIndex >= index) fail(challenge.id + ' has invalid prerequisite: ' + prerequisite);
        }
      }
    }
  }
}

function checkFixtures() {
  for (const { challenge } of allChallenges) {
    const fixture = fixtures[challenge.id];
    if (!fixture) {
      fail('missing fixtures for ' + challenge.id);
      continue;
    }
    const starter = runCode(challenge.starter);
    if (evaluateTests(challenge, { consoleLines: starter.output, appText: starter.appText }, starter.error).ok) {
      fail(challenge.id + ' starter unexpectedly passes');
    }
    if (!fixture.solutions?.length) fail(challenge.id + ' needs a reference solution');
    for (const [index, solution] of (fixture.solutions || []).entries()) {
      const result = runCode(solution);
      if (!evaluateTests(challenge, { consoleLines: result.output, appText: result.appText }, result.error).ok) {
        fail(challenge.id + ' solution ' + (index + 1) + ' does not pass');
      }
    }
    if (!fixture.wrong?.length) fail(challenge.id + ' needs named wrong cases');
    for (const wrong of fixture.wrong || []) {
      const result = runCode(wrong.code);
      if (evaluateTests(challenge, { consoleLines: result.output, appText: result.appText }, result.error).ok) {
        fail(challenge.id + ' wrong case passes: ' + wrong.name);
      }
    }
  }
}

checkShape();
checkFixtures();

if (errors.length) {
  for (const error of errors) console.error('course validation: ' + error);
  process.exitCode = 1;
} else {
  console.log('course validation ok: ' + allChallenges.length + ' challenges');
}

assert.equal(errors.length, 0, errors.join('\n'));
