// Pure evaluator for challenge runs. Zero dependencies and module-scope free:
// every helper lives inside `evaluateTests` so its .toString() body is
// self-contained and survives minification — the sandboxed runner iframe
// re-evaluates it by source text.

export function evaluateTests(challenge, observed, error = null) {
  const normalizeLines = (lines) => lines.map((line) => String(line).replace(/\r\n?/g, '\n'));
  const normalizeText = (value) => String(value).replace(/\r\n?/g, '\n');

  const checks = challenge.tests.map((test) => {
    const actual = test.type === 'console-lines'
      ? normalizeLines(observed.consoleLines || [])
      : normalizeText(observed.appText || '');
    const expected = test.type === 'console-lines'
      ? normalizeLines(test.expected)
      : normalizeText(test.expected);
    const pass = !error && JSON.stringify(actual) === JSON.stringify(expected);
    return {
      id: test.id,
      pass,
      actual,
      expected,
      message: pass ? 'Passed.' : (test.failure || 'This check did not pass.'),
    };
  });

  return {
    ok: !error && checks.every((check) => check.pass),
    checks,
    error: error ? { name: error.name || 'Error', message: error.message || 'The program failed.' } : null,
  };
}
