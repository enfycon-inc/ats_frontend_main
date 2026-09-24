const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../lib/logo-bounds.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
new Function('exports', code)(loaded.exports);
const { visibleLogoBounds } = loaded.exports;

test('transparent canvas margins do not reduce the visible logo size', () => {
  const pixels = new Uint8ClampedArray(10 * 8 * 4);
  for (let y = 2; y <= 4; y++) for (let x = 1; x <= 8; x++) pixels[(y * 10 + x) * 4 + 3] = 255;
  assert.deepEqual(visibleLogoBounds(pixels, 10, 8), { x: 1, y: 2, width: 8, height: 3 });
});

test('opaque and fully transparent images retain valid full bounds', () => {
  assert.deepEqual(visibleLogoBounds(new Uint8ClampedArray(4 * 3 * 4).fill(255), 4, 3), { x: 0, y: 0, width: 4, height: 3 });
  assert.deepEqual(visibleLogoBounds(new Uint8ClampedArray(4 * 3 * 4), 4, 3), { x: 0, y: 0, width: 4, height: 3 });
});
