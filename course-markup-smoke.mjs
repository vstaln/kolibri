import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

for (const marker of [
  '<section class="section course-section" id="course"',
  'data-course-map',
  'id="course-challenge-title"',
  '<label for="course-editor">',
  '<textarea id="course-editor"',
  'id="course-run"',
  'id="course-reset"',
  'id="course-next"',
  'id="course-feedback" role="status"',
  'id="course-hints"',
]) {
  assert.ok(page.includes(marker), `course markup missing: ${marker}`);
}

console.log('course markup smoke ok');
