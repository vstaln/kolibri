// @vitest-environment node
// The runner iframe re-evaluates evaluateTests by source text, inlined from
// the (minified) bundle. Two separate esbuild hazards must stay fixed:
//  1. module-scope helpers get renamed, so the body must carry its own
//  2. the function's own name gets renamed (evaluateTests -> Nw), so the
//     srcdoc must bind the inlined text to the original name, not emit it as
//     a bare declaration.
// This reproduces both failures and guards them. Runs in the node environment
// because esbuild's native shim depends on the real TextEncoder, which jsdom
// replaces.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { evaluateTests } from '../../course-evaluator.mjs';
const { transform } = createRequire(import.meta.url)('esbuild');

const challenge = { tests: [{ type: 'console-lines', id: 'greet', expected: ['Hello, Ada'], failure: 'nope' }] };

describe('evaluator source inlining', () => {
  it('binds the minified source to the original name (name-renaming regression)', async () => {
    // Mirror the real bundle: the module function is minified and renamed.
    const minified = await transform(`globalThis.__eval = (${evaluateTests.toString()});`, { format: 'esm', minify: true });
    const renamedFn = minified.code
      .replace(/^globalThis\.__eval\s*=/, '')
      .replace(/\);?\s*$/, '')
      .replace(/^\(/, '')
      .replace(/\)$/, '');
    expect(renamedFn).not.toContain('evaluateTests'); // esbuild renamed the declaration

    // The old (broken) inlining: bare emission of the renamed declaration —
    // the name is gone, so either the iframe never binds evaluateTests or the
    // anonymous minified form is a syntax error. Both fail to run.
    expect(() => new Function(`${renamedFn}\nreturn typeof evaluateTests;`)).toThrow();

    // The fixed inlining: assign to the original name (named function expr).
    const fixedInline = new Function(`const evaluateTests = ${renamedFn};\nreturn evaluateTests;`)();
    expect(typeof fixedInline).toBe('function');
    expect(fixedInline(challenge, { consoleLines: ['Hello, Ada'], appText: '' }).ok).toBe(true);
    expect(fixedInline(challenge, { consoleLines: ['Hello'], appText: '' }).ok).toBe(false);
  });

  it('runs standalone after esbuild minification (helper-renaming regression)', async () => {
    const minified = await transform(`globalThis.__eval = (${evaluateTests.toString()});`, { format: 'esm', minify: true });
    const renamedFn = minified.code
      .replace(/^globalThis\.__eval\s*=/, '')
      .replace(/\);?\s*$/, '')
      .replace(/^\(/, '')
      .replace(/\)$/, '');
    const rebuilt = new Function(`return ${renamedFn}`)();
    expect(typeof rebuilt).toBe('function');
    expect(rebuilt(challenge, { consoleLines: ['Hello, Ada'], appText: '' }).ok).toBe(true);
    expect(rebuilt(challenge, { consoleLines: ['Hello'], appText: '' }).ok).toBe(false);
  });
});
