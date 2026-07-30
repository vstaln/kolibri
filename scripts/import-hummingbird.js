#!/usr/bin/env node
'use strict';

// One-shot import: lift a motion-stabilised hummingbird dataset out of one of the
// standalone viewer HTML files into course/assets/. ASCII frames and their
// brightness grids are copied verbatim; only the container is rewritten.
//
//   node course/scripts/import-hummingbird.js <source.html> <slug> <export-name>
//
// Writes assets/<slug>_data.js (frames) and assets/<slug>-frame0.txt (the frame
// the markup ships so the page has a bird before and without JavaScript).

const fs = require('fs');
const path = require('path');

const [src, slug, exportName] = process.argv.slice(2);
if (!src || !slug || !exportName) {
  console.error('usage: node import-hummingbird.js <source.html> <slug> <export-name>');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const start = html.indexOf('const hummingbirdData = ');
if (start < 0) throw new Error('hummingbirdData not found');
const open = html.indexOf('{', start);
const end = html.indexOf('};', open);
if (end < 0) throw new Error('dataset terminator not found');
const data = JSON.parse(html.slice(open, end + 1));

const outDir = path.join(__dirname, '..', 'assets');
const header =
  `// Hummingbird ASCII + brightness dataset (${slug}, ${data.frames.length} frames, ` +
  `${data.width}x${data.height}).\n` +
  `// Imported verbatim from the standalone viewer by scripts/import-hummingbird.js.\n` +
  `// Brightness drives the blue hue and glow in app.js renderBirdFrame().\n`;

fs.writeFileSync(
  path.join(outDir, `${slug}_data.js`),
  `${header}export const ${exportName} = ${JSON.stringify({
    char_palette: data.char_palette,
    total_frames: data.frames.length,
    width: data.width,
    height: data.height,
    frames: data.frames.map((f) => ({ ascii: f.ascii, brightness: f.brightness })),
  })};\nexport default ${exportName};\n`,
  'utf8'
);
fs.writeFileSync(path.join(outDir, `${slug}-frame0.txt`), data.frames[0].ascii, 'utf8');

console.log(`${slug}: ${data.frames.length} frames, ${data.width}x${data.height}, palette ${JSON.stringify(data.char_palette)}`);
