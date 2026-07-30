#!/usr/bin/env node
'use strict';

// One-shot import: lift the stabilised hovering-hummingbird dataset out of the
// standalone viewer HTML into course/assets/hummingbird_data.js.
// ASCII frames are copied verbatim; only the container is rewritten.
//
// Usage: node course/scripts/import-hummingbird.js <source.html> [--analyse]

const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('usage: node import-hummingbird.js <source.html> [--analyse]');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const start = html.indexOf('const hummingbirdData = ');
if (start < 0) throw new Error('hummingbirdData not found');
const open = html.indexOf('{', start);
const end = html.indexOf('};', open);
if (end < 0) throw new Error('dataset terminator not found');
const data = JSON.parse(html.slice(open, end + 1));

const palette = data.char_palette;
console.log(`palette=${JSON.stringify(palette)} frames=${data.frames.length} ${data.width}x${data.height}`);

if (process.argv.includes('--analyse')) {
  // Can brightness be recovered from the glyph alone? If the encoder mapped
  // brightness -> palette index monotonically, the 1.2 MB brightness grid is
  // redundant and can be dropped.
  const byChar = new Map();
  let cells = 0;
  for (const f of data.frames) {
    const lines = f.ascii.split('\n');
    for (let y = 0; y < lines.length; y++) {
      const row = f.brightness[y] || [];
      for (let x = 0; x < lines[y].length; x++) {
        const ch = lines[y][x];
        const v = row[x] || 0;
        cells++;
        let s = byChar.get(ch);
        if (!s) byChar.set(ch, (s = { min: 255, max: 0, n: 0 }));
        s.n++;
        if (v < s.min) s.min = v;
        if (v > s.max) s.max = v;
      }
    }
  }
  console.log(`cells=${cells}`);
  for (const [ch, s] of [...byChar].sort()) {
    console.log(`  ${JSON.stringify(ch)} n=${s.n} brightness ${s.min}..${s.max}`);
  }
  process.exit(0);
}

const outDir = path.join(__dirname, '..', 'assets');
const header =
  `// Hummingbird ASCII + brightness dataset (hovering in flight, ` +
  `${data.frames.length} frames, ${data.width}x${data.height}).\n` +
  `// Imported verbatim from the standalone viewer by scripts/import-hummingbird.js.\n` +
  `// Brightness drives the blue hue and glow in app.js renderBirdFrame().\n`;

fs.writeFileSync(
  path.join(outDir, 'hummingbird_data.js'),
  `${header}export const hummingbirdAnimation = ${JSON.stringify({
    char_palette: palette,
    total_frames: data.frames.length,
    width: data.width,
    height: data.height,
    frames: data.frames.map((f) => ({ ascii: f.ascii, brightness: f.brightness })),
  })};\nexport default hummingbirdAnimation;\n`,
  'utf8'
);

// The no-JS / pre-hydration frame is frame 0, byte-for-byte.
fs.writeFileSync(path.join(outDir, 'kolibri-hummingbird.txt'), data.frames[0].ascii, 'utf8');

console.log('wrote assets/hummingbird_data.js and assets/kolibri-hummingbird.txt');
