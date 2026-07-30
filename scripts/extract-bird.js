// One-shot: lift the existing hummingbird ASCII out of index.html into an asset file
// so the artwork is reused from a single source instead of retyped.
const fs = require('fs');

const html = fs.readFileSync('course/index.html', 'utf8');
const match = html.match(/<pre class="bird" id="bird" aria-hidden="true">([\s\S]*?)<\/pre>/);
if (!match) throw new Error('hummingbird pre not found');

const art = match[1];
fs.writeFileSync('course/assets/kolibri-hummingbird.txt', art, 'utf8');
console.log('rows', art.split('\n').length, 'maxCols', Math.max(...art.split('\n').map((l) => l.length)));
